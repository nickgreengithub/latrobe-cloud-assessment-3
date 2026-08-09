import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, handle, ok, readPaging } from "@/lib/api-response";
import { postCreateSchema, slugify } from "@/lib/validation";
import { resolveAuthorByName } from "@/lib/authors";
import { POST_INCLUDE, serializePost } from "@/lib/serialize";

/**
 * GET /api/posts — list items, filterable by channel, status and free text.
 * Supports ?feed=&q=&status=&page=&limit= and reports total/page/limit in meta.
 */
export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const url = new URL(request.url);
    const { page, limit, skip } = readPaging(url);

    const feed = url.searchParams.get("feed");
    const q = url.searchParams.get("q");
    const status = url.searchParams.get("status");

    const where = {
      ...(status ? { status } : {}),
      ...(feed ? { feeds: { some: { feed: { slug: feed } } } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { summary: { contains: q } },
              { content: { contains: q } },
            ],
          }
        : {}),
    };

    const [total, posts] = await prisma.$transaction([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        include: POST_INCLUDE,
        orderBy: { pubDate: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return ok(posts.map(serializePost), { total, page, limit });
  });
}

/** POST /api/posts — create an item and syndicate it to one or more channels. */
export async function POST(request: NextRequest) {
  return handle(request, async () => {
    const body = postCreateSchema.parse(await request.json());
    const { feedSlugs, authorName, pubDate, slug, ...fields } = body;

    const feeds = await prisma.feed.findMany({ where: { slug: { in: feedSlugs } } });
    if (feeds.length !== feedSlugs.length) {
      const found = new Set(feeds.map((f) => f.slug));
      return fail(
        "Unknown channel slug",
        400,
        feedSlugs.filter((s) => !found.has(s)),
      );
    }

    // An author may be supplied by id, or by name for convenience from the UI.
    // Match an existing author by name before creating one, otherwise every
    // post filed under a name that already exists spawns a duplicate person.
    let authorId = fields.authorId;
    if (!authorId && authorName) {
      authorId = (await resolveAuthorByName(authorName)).id;
    }

    const finalSlug = slug ?? `${slugify(fields.title)}-${Date.now().toString(36)}`;

    const post = await prisma.post.create({
      data: {
        ...fields,
        authorId,
        slug: finalSlug,
        guid: finalSlug,
        pubDate: pubDate ? new Date(pubDate) : new Date(),
        feeds: { create: feeds.map((feed) => ({ feedId: feed.id })) },
      },
      include: POST_INCLUDE,
    });

    return ok(serializePost(post), undefined, 201);
  });
}
