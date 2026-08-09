import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api-response";

/**
 * Feed statistics — the second operational endpoint.
 *
 * All aggregates run inside one $transaction so the numbers are consistent
 * with each other: a post created between two separate queries could otherwise
 * make the totals disagree.
 */
export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const [feeds, authors, totalPosts, published, drafts, latest, subscribers, polls] =
      await prisma.$transaction([
        prisma.feed.findMany({
          orderBy: { title: "asc" },
          include: { _count: { select: { posts: true } } },
        }),
        prisma.author.findMany({
          orderBy: { name: "asc" },
          include: { _count: { select: { posts: true } } },
        }),
        prisma.post.count(),
        prisma.post.count({ where: { status: "published" } }),
        prisma.post.count({ where: { status: "draft" } }),
        prisma.post.findFirst({
          where: { status: "published" },
          orderBy: { pubDate: "desc" },
          select: { title: true, pubDate: true },
        }),
        prisma.subscriber.findMany({ orderBy: { pollCount: "desc" } }),
        prisma.subscriber.aggregate({ _sum: { pollCount: true } }),
      ]);

    return ok({
      posts: {
        total: totalPosts,
        published,
        drafts,
        latestPublishedAt: latest?.pubDate ?? null,
        latestTitle: latest?.title ?? null,
      },
      channels: {
        total: feeds.length,
        breakdown: feeds.map((feed) => ({
          slug: feed.slug,
          title: feed.title,
          postCount: feed._count.posts,
          rssUrl: `/rss/${feed.slug}`,
        })),
      },
      authors: {
        total: authors.length,
        breakdown: authors.map((author) => ({
          name: author.name,
          postCount: author._count.posts,
        })),
      },
      subscribers: {
        total: subscribers.length,
        totalPolls: polls._sum.pollCount ?? 0,
        breakdown: subscribers.map((sub) => ({
          name: sub.name,
          clientUrl: sub.clientUrl,
          pollCount: sub.pollCount,
          lastPolledAt: sub.lastPolledAt,
        })),
      },
    });
  });
}
