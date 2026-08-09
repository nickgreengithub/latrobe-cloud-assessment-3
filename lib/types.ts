/**
 * Shapes the UI works with.
 *
 * In Assessment 1 these types described objects held in local storage. They now
 * describe what the API returns, and the mapping between the two lives in
 * `toFeedItem` below — so the components keep one flat shape to render while
 * the server keeps its normalised one.
 */

export type Channel = {
  id: string;
  slug: string;
  title: string;
  description: string;
  language: string;
  ttl: number;
  imageUrl: string | null;
  postCount?: number;
  rssUrl?: string;
};

/** A post exactly as `/api/posts` returns it. */
export type ApiPost = {
  id: string;
  slug: string;
  guid: string;
  title: string;
  summary: string;
  content: string;
  link: string | null;
  imageUrl: string | null;
  pubDate: string;
  status: string;
  author: { id: string; name: string; email: string | null } | null;
  enclosures: { id: string; url: string; mimeType: string; lengthBytes: number }[];
  feeds: { id: string; slug: string; title: string }[];
};

/** The flattened shape the list and detail views render. */
export type FeedItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  /** Display name of the first channel — the UI's "category" label. */
  category: string;
  /** Every channel this post belongs to. */
  channels: { slug: string; title: string }[];
  pubDate: string;
  imageUrl?: string;
  source?: string;
  status: string;
};

export function toFeedItem(post: ApiPost): FeedItem {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    content: post.content,
    author: post.author?.name ?? "Unattributed",
    category: post.feeds[0]?.title ?? "Uncategorised",
    channels: post.feeds.map(({ slug, title }) => ({ slug, title })),
    pubDate: post.pubDate,
    imageUrl: post.imageUrl ?? undefined,
    source: post.feeds.map((f) => f.title).join(", ") || undefined,
    status: post.status,
  };
}

/** Formats an ISO date for display. Carried over unchanged from Assessment 1. */
export function formatFeedDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
