import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { POST_INCLUDE, serializePost } from "@/lib/serialize";
import { RSS_HEADERS, readFeedLimit, recordPoll, renderRssFeed } from "@/lib/rss";
import { siteUrlFrom } from "@/lib/site";

/**
 * GET /rss/[slug] — one channel, e.g. /rss/careers.
 *
 * This is the whole client story: subscribing to a different category means
 * pointing at a different URL, nothing more.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const siteUrl = siteUrlFrom(request);

  const feed = await prisma.feed.findUnique({ where: { slug } });

  // A client asking for a channel that does not exist should be told so,
  // rather than handed a valid but empty feed it would poll forever.
  if (!feed) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<error>Unknown channel: ${slug}</error>\n`,
      { status: 404, headers: { "Content-Type": "application/xml; charset=utf-8" } },
    );
  }

  await recordPoll(url.searchParams.get("subscriber"), prisma);

  const posts = await prisma.post.findMany({
    where: { status: "published", feeds: { some: { feedId: feed.id } } },
    include: POST_INCLUDE,
    orderBy: { pubDate: "desc" },
    take: readFeedLimit(url),
  });

  const xml = renderRssFeed(
    {
      title: feed.title,
      link: `${siteUrl}/feeds?channel=${feed.slug}`,
      description: feed.description,
      language: feed.language,
      ttl: feed.ttl,
      imageUrl: feed.imageUrl,
      feedUrl: `${siteUrl}/rss/${feed.slug}`,
    },
    posts.map(serializePost),
    siteUrl,
  );

  return new Response(xml, { headers: RSS_HEADERS });
}
