/**
 * Posts authored on the RSS server, shaped like the RSS entries the server
 * will publish in Assessment 2. Each post has a category. Persisted in
 * localStorage as sample content for the frontend-only Assessment 1.
 */

export type FeedItem = {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  category: string;
  pubDate: string;
  imageUrl?: string;
  source?: string;
};

export const FEEDS_STORAGE_KEY = "rss_lms_feeds_v2";

/** Categories an admin can file a post under (the "RSS feeds + category" model). */
export const FEED_CATEGORIES = [
  "Careers",
  "Events",
  "Academic",
  "Administrative",
  "General",
] as const;

export const SEED_FEEDS: FeedItem[] = [
  {
    id: "seed-internship-call",
    title: "Industry internship expressions of interest",
    summary:
      "Partner organisations are offering short internship placements for cloud and web students.",
    content:
      "Several partner organisations are seeking expressions of interest for short industry internships. An admin publishes this as a categorised post on the RSS server, which the server then serves to subscribed client applications.\n\nAssessment 1 is frontend only, so posts are held in local storage as sample content; Assessment 2 adds the server backend that publishes these posts as live RSS.",
    author: "Careers & Employability",
    category: "Careers",
    pubDate: "2026-07-18T09:00:00.000Z",
    source: "University-wide",
  },
  {
    id: "seed-hackathon",
    title: "Campus hackathon — volunteer facilitators needed",
    summary:
      "Facilitators needed for a weekend cloud-native hackathon. Sign-up closes Friday.",
    content:
      "We need twenty student facilitators for a weekend hackathon focused on cloud-native tooling. Shifts are short and training is provided. The admin files it as an Events post so client apps subscribed to the server receive it.\n\nThis is sample content for the Assessment 1 frontend; in Assessment 2 the server backend serves these posts as RSS.",
    author: "Student Engagement",
    category: "Events",
    pubDate: "2026-07-20T18:00:00.000Z",
    source: "University-wide",
  },
  {
    id: "seed-lab-reminder",
    title: "Module 4 — dynamic pages and list rendering",
    summary:
      "Lab reminder: practice list rendering and dynamic routes before Assessment 1 submission.",
    content:
      "This week’s lab covers advanced React patterns: mapping collections, dynamic segments, and navigation between list and detail views. Those patterns map directly onto this server UI: one view lists the posts, another expands a single post.\n\nUse this sample UI to rehearse that flow with local data before the server backend is added in Assessment 2.",
    author: "Subject Coordinator",
    category: "Academic",
    pubDate: "2026-07-22T08:30:00.000Z",
    source: "CSE2CWA / CSE5CWA",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadFeeds(): FeedItem[] {
  if (!canUseStorage()) return SEED_FEEDS;
  try {
    const raw = localStorage.getItem(FEEDS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(SEED_FEEDS));
      return SEED_FEEDS;
    }
    const parsed = JSON.parse(raw) as FeedItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(SEED_FEEDS));
      return SEED_FEEDS;
    }
    // Normalise older records that predate the category field.
    return parsed.map((feed) => ({ ...feed, category: feed.category || "General" }));
  } catch {
    return SEED_FEEDS;
  }
}

export function saveFeeds(feeds: FeedItem[]) {
  if (!canUseStorage()) return;
  localStorage.setItem(FEEDS_STORAGE_KEY, JSON.stringify(feeds));
}

export function getFeedById(id: string): FeedItem | undefined {
  return loadFeeds().find((feed) => feed.id === id);
}

export function addFeed(
  input: Omit<FeedItem, "id" | "pubDate"> & { pubDate?: string },
): FeedItem {
  const feeds = loadFeeds();
  const item: FeedItem = {
    id: `feed-${Date.now()}`,
    pubDate: input.pubDate ?? new Date().toISOString(),
    title: input.title.trim(),
    summary: input.summary.trim(),
    content: input.content.trim(),
    author: input.author.trim() || "Anonymous",
    category: input.category?.trim() || "General",
    imageUrl: input.imageUrl?.trim() || undefined,
    source: input.source?.trim() || "Local draft",
  };
  const next = [item, ...feeds];
  saveFeeds(next);
  return item;
}

export function deleteFeed(id: string) {
  const next = loadFeeds().filter((feed) => feed.id !== id);
  saveFeeds(next);
  return next;
}

export function resetFeeds() {
  saveFeeds(SEED_FEEDS);
  return SEED_FEEDS;
}

export function formatFeedDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
