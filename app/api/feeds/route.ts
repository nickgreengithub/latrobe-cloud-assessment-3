import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api-response";
import { feedCreateSchema } from "@/lib/validation";

/**
 * Channels. There is no separate /api/categories: a channel *is* a category,
 * so this is the single resource behind both the RSS URLs and the UI filter.
 */
export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const feeds = await prisma.feed.findMany({
      orderBy: { title: "asc" },
      include: { _count: { select: { posts: true } } },
    });

    return ok(
      feeds.map(({ _count, ...feed }) => ({
        ...feed,
        postCount: _count.posts,
        rssUrl: `/rss/${feed.slug}`,
      })),
      { total: feeds.length },
    );
  });
}

export async function POST(request: NextRequest) {
  return handle(request, async () => {
    const body = feedCreateSchema.parse(await request.json());
    const feed = await prisma.feed.create({
      data: { ...body, link: body.link ?? `/rss/${body.slug}` },
    });
    return ok(feed, undefined, 201);
  });
}
