import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, handle, ok } from "@/lib/api-response";
import { feedUpdateSchema } from "@/lib/validation";
import { POST_INCLUDE, serializePost } from "@/lib/serialize";

type Ctx = { params: Promise<{ id: string }> };

function byIdOrSlug(id: string) {
  return { OR: [{ id }, { slug: id }] };
}

export async function GET(request: NextRequest, { params }: Ctx) {
  return handle(request, async () => {
    const { id } = await params;
    const feed = await prisma.feed.findFirst({ where: byIdOrSlug(id) });
    if (!feed) return fail("Channel not found", 404);

    const posts = await prisma.post.findMany({
      where: { feeds: { some: { feedId: feed.id } } },
      include: POST_INCLUDE,
      orderBy: { pubDate: "desc" },
    });

    return ok({ ...feed, rssUrl: `/rss/${feed.slug}`, posts: posts.map(serializePost) });
  });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(request, async () => {
    const { id } = await params;
    const body = feedUpdateSchema.parse(await request.json());
    const existing = await prisma.feed.findFirst({ where: byIdOrSlug(id) });
    if (!existing) return fail("Channel not found", 404);

    const feed = await prisma.feed.update({ where: { id: existing.id }, data: body });
    return ok(feed);
  });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  return handle(request, async () => {
    const { id } = await params;
    const existing = await prisma.feed.findFirst({ where: byIdOrSlug(id) });
    if (!existing) return fail("Channel not found", 404);

    // Cascade removes the join rows; the posts themselves survive.
    await prisma.feed.delete({ where: { id: existing.id } });
    return ok({ id: existing.id, deleted: true });
  });
}
