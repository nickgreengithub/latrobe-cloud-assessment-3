import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { POST_INCLUDE, serializePost } from "@/lib/serialize";
import { RSS_HEADERS, readFeedLimit, recordPoll, renderRssFeed } from "@/lib/rss";
import { siteUrlFrom } from "@/lib/site";
import { clientKeyFrom, recordFeedFetch, recordRequest } from "@/lib/metrics";
import { withSpan } from "@/lib/otel";

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
  const startedAt = Date.now();
  const { slug } = await params;
  const url = new URL(request.url);
  const siteUrl = siteUrlFrom(request);
  const clientKey = clientKeyFrom(request);

  const feed = await withSpan("rss.lookup_channel", { "rss.feed": slug }, () =>
    prisma.feed.findUnique({ where: { slug } }),
  );

  // A client asking for a channel that does not exist should be told so,
  // rather than handed a valid but empty feed it would poll forever.
  if (!feed) {
    recordRequest(request, 404, startedAt);
    recordFeedFetch({
      feedSlug: slug,
      statusCode: 404,
      durationMs: Date.now() - startedAt,
      error: `Unknown channel: ${slug}`,
      clientKey,
    });
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<error>Unknown channel: ${slug}</error>\n`,
      { status: 404, headers: { "Content-Type": "application/xml; charset=utf-8" } },
    );
  }

  await recordPoll(url.searchParams.get("subscriber"));

  const posts = await withSpan(
    "rss.load_items",
    { "rss.feed": feed.slug, "rss.limit": readFeedLimit(url) },
    () =>
      prisma.post.findMany({
        where: { status: "published", feeds: { some: { feedId: feed.id } } },
        include: POST_INCLUDE,
        orderBy: { pubDate: "desc" },
        take: readFeedLimit(url),
      }),
  );

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

  recordRequest(request, 200, startedAt);
  recordFeedFetch({
    feedSlug: feed.slug,
    statusCode: 200,
    itemCount: posts.length,
    durationMs: Date.now() - startedAt,
    clientKey,
  });

  return new Response(xml, { headers: RSS_HEADERS });
}
