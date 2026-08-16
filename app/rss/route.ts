import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { POST_INCLUDE, serializePost } from "@/lib/serialize";
import { RSS_HEADERS, readFeedLimit, recordPoll, renderRssFeed } from "@/lib/rss";
import { siteUrlFrom } from "@/lib/site";
import {
  AGGREGATE_FEED,
  clientKeyFrom,
  recordFeedFetch,
  recordRequest,
} from "@/lib/metrics";

/**
 * GET /rss — the aggregate channel.
 *
 * Whatever is current across every channel, newest first. A client that just
 * wants "everything this server publishes" points here and needs to know
 * nothing about the channel structure.
 */
export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const siteUrl = siteUrlFrom(request);
  const limit = readFeedLimit(url);

  await recordPoll(url.searchParams.get("subscriber"));

  const posts = await prisma.post.findMany({
    where: { status: "published" },
    include: POST_INCLUDE,
    orderBy: { pubDate: "desc" },
    take: limit,
  });

  const xml = renderRssFeed(
    {
      title: "La Trobe RSS Server — all announcements",
      link: `${siteUrl}/feeds`,
      description:
        "Every current announcement published by the La Trobe RSS Server, across all channels.",
      language: "en-AU",
      ttl: 60,
      feedUrl: `${siteUrl}/rss`,
    },
    posts.map(serializePost),
    siteUrl,
  );

  // Feed polls do not pass through handle(), so they record their own
  // telemetry — otherwise the busiest route on the server would be the one
  // route the dashboard could not see.
  recordRequest(request, 200, startedAt);
  recordFeedFetch({
    feedSlug: AGGREGATE_FEED,
    statusCode: 200,
    itemCount: posts.length,
    durationMs: Date.now() - startedAt,
    clientKey: clientKeyFrom(request),
  });

  return new Response(xml, { headers: RSS_HEADERS });
}
