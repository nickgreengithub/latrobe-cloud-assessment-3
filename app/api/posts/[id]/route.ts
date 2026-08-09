import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, handle, ok } from "@/lib/api-response";
import { postUpdateSchema } from "@/lib/validation";
import { resolveAuthorByName } from "@/lib/authors";
import { POST_INCLUDE, serializePost } from "@/lib/serialize";

/**
 * Single-item CRUD. `params` is a Promise in Next 16 and must be awaited.
 * Lookups accept either the cuid or the slug, so URLs stay readable on camera.
 */
type Ctx = { params: Promise<{ id: string }> };

function byIdOrSlug(id: string) {
  return { OR: [{ id }, { slug: id }] };
}

export async function GET(request: NextRequest, { params }: Ctx) {
  return handle(request, async () => {
    const { id } = await params;
    const post = await prisma.post.findFirst({
      where: byIdOrSlug(id),
      include: POST_INCLUDE,
    });
    return post ? ok(serializePost(post)) : fail("Post not found", 404);
  });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(request, async () => {
    const { id } = await params;
    const body = postUpdateSchema.parse(await request.json());
    const { feedSlugs, authorName, pubDate, ...fields } = body;

    const existing = await prisma.post.findFirst({ where: byIdOrSlug(id) });
    if (!existing) return fail("Post not found", 404);

    // Re-attribution by name, matching the create endpoint.
    let authorId = fields.authorId;
    if (!authorId && authorName) {
      authorId = (await resolveAuthorByName(authorName)).id;
    }

    if (feedSlugs) {
      const feeds = await prisma.feed.findMany({ where: { slug: { in: feedSlugs } } });
      if (feeds.length !== feedSlugs.length) {
        const found = new Set(feeds.map((f) => f.slug));
        return fail(
          "Unknown channel slug",
          400,
          feedSlugs.filter((s) => !found.has(s)),
        );
      }
      // Replace the channel assignments wholesale rather than merging.
      await prisma.feedPost.deleteMany({ where: { postId: existing.id } });
      await prisma.feedPost.createMany({
        data: feeds.map((feed) => ({ feedId: feed.id, postId: existing.id })),
      });
    }

    const post = await prisma.post.update({
      where: { id: existing.id },
      data: { ...fields, authorId, ...(pubDate ? { pubDate: new Date(pubDate) } : {}) },
      include: POST_INCLUDE,
    });

    return ok(serializePost(post));
  });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  return handle(request, async () => {
    const { id } = await params;
    const existing = await prisma.post.findFirst({ where: byIdOrSlug(id) });
    if (!existing) return fail("Post not found", 404);

    // Join rows and enclosures cascade away with the post.
    await prisma.post.delete({ where: { id: existing.id } });
    return ok({ id: existing.id, deleted: true });
  });
}
