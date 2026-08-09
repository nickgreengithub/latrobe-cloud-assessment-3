import type { SerializedPost } from "@/lib/serialize";
import { prisma } from "@/lib/db";

/**
 * RSS 2.0 rendering, shared by /rss and /rss/[slug].
 *
 * Two details in here are the usual source of invalid feeds: pubDate must be
 * RFC-822 (toUTCString), not ISO-8601, and every text value must be escaped or
 * wrapped in CDATA — the seed content contains ampersands and typographic
 * quotes that would otherwise produce malformed XML.
 */

/** Escapes the five XML predefined entities. */
export function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Wraps free text in CDATA, neutralising any embedded terminator. */
function cdata(value: string) {
  return `<![CDATA[${value.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** RSS requires RFC-822 dates. Date.toUTCString() produces exactly that. */
export function rfc822(date: Date) {
  return date.toUTCString();
}

export type RssChannel = {
  title: string;
  link: string;
  description: string;
  language: string;
  ttl: number;
  imageUrl?: string | null;
  /** Self-referencing URL for the atom:link rel="self" hint. */
  feedUrl: string;
};

function renderItem(post: SerializedPost, siteUrl: string) {
  const link = post.link ?? `${siteUrl}/feeds/${post.slug}`;
  const parts = [
    `      <title>${cdata(post.title)}</title>`,
    `      <link>${escapeXml(link)}</link>`,
    `      <description>${cdata(post.summary)}</description>`,
    `      <content:encoded>${cdata(post.content)}</content:encoded>`,
    `      <pubDate>${rfc822(new Date(post.pubDate))}</pubDate>`,
    `      <guid isPermaLink="false">${escapeXml(post.guid)}</guid>`,
  ];

  if (post.author?.name) {
    parts.push(`      <dc:creator>${cdata(post.author.name)}</dc:creator>`);
  }

  // Channel membership is emitted as <category> so a client reading the
  // aggregate feed can still tell which channel each item came from.
  for (const feed of post.feeds) {
    parts.push(`      <category>${escapeXml(feed.title)}</category>`);
  }

  for (const enclosure of post.enclosures) {
    parts.push(
      `      <enclosure url="${escapeXml(enclosure.url)}" type="${escapeXml(
        enclosure.mimeType,
      )}" length="${enclosure.lengthBytes}" />`,
    );
  }

  return `    <item>\n${parts.join("\n")}\n    </item>`;
}

export function renderRssFeed(
  channel: RssChannel,
  posts: SerializedPost[],
  siteUrl: string,
) {
  const lastBuildDate = posts.length
    ? rfc822(new Date(posts[0].pubDate))
    : rfc822(new Date());

  const image = channel.imageUrl
    ? `    <image>\n      <url>${escapeXml(channel.imageUrl)}</url>\n` +
      `      <title>${cdata(channel.title)}</title>\n` +
      `      <link>${escapeXml(channel.link)}</link>\n    </image>\n`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:dc="http://purl.org/dc/elements/1.1/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${cdata(channel.title)}</title>
    <link>${escapeXml(channel.link)}</link>
    <description>${cdata(channel.description)}</description>
    <language>${escapeXml(channel.language)}</language>
    <generator>La Trobe RSS Server (Next.js + Prisma)</generator>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>${channel.ttl}</ttl>
    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />
${image}${posts.map((post) => renderItem(post, siteUrl)).join("\n")}
  </channel>
</rss>
`;
}

/** Standard headers for an RSS response. */
export const RSS_HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "public, max-age=60",
};

/** Reads ?limit=, defaulting to 20 and capping at 50. */
export function readFeedLimit(url: URL) {
  const raw = Number(url.searchParams.get("limit") ?? 20) || 20;
  return Math.min(50, Math.max(1, raw));
}

/**
 * Records a poll when a client identifies itself with ?subscriber=<id>.
 * Fire-and-forget: feed delivery must not fail because telemetry did.
 */
export async function recordPoll(subscriberId: string | null) {
  if (!subscriberId) return;
  try {
    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { pollCount: { increment: 1 }, lastPolledAt: new Date() },
    });
  } catch {
    // Unknown subscriber id — ignore rather than refuse the feed.
  }
}
