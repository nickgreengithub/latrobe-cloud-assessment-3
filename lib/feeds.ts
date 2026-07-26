/**
 * Sample/local feed items shaped like future RSS entries for Assessment 2.
 * Module 4 Part 2 blog-style stand-in — persisted in localStorage for A1.
 */

export type FeedItem = {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  pubDate: string;
  imageUrl?: string;
  source?: string;
};

export const FEEDS_STORAGE_KEY = "rss_lms_feeds_v1";

export const SEED_FEEDS: FeedItem[] = [
  {
    id: "seed-internship-call",
    title: "Industry internship expressions of interest",
    summary:
      "Cross-subject notice: short internship placements open for cloud and web students.",
    content:
      "Several partner organisations are seeking expressions of interest for short industry internships. Rather than relying on crowded student email inboxes, this announcement is published as a feed item so it can surface inside the LMS announcement stream for every enrolled subject.\n\nAssessment 1 uses local sample content; Assessment 2 will replace this with a live RSS ingest path.",
    author: "Careers & Employability",
    pubDate: "2026-07-18T09:00:00.000Z",
    source: "Sample LMS feed",
  },
  {
    id: "seed-hackathon",
    title: "Campus hackathon — volunteer facilitators needed",
    summary:
      "Facilitators needed for a weekend cloud-native hackathon. Sign-up closes Friday.",
    content:
      "We need twenty student facilitators for a weekend hackathon focused on cloud-native tooling. Shifts are short, training is provided, and the same notice should appear in every subject feed so students do not miss it among hundreds of emails.\n\nThis post is sample content for the Assessment 1 frontend. In Assessment 2, subject servers will publish equivalent items as RSS.",
    author: "Student Engagement",
    pubDate: "2026-07-20T18:00:00.000Z",
    source: "Sample LMS feed",
  },
  {
    id: "seed-lab-reminder",
    title: "Module 4 — dynamic pages and list rendering",
    summary:
      "Lab reminder: practice list rendering and dynamic routes before Assessment 1 submission.",
    content:
      "This week’s lab covers advanced React patterns: mapping collections, dynamic segments, and navigation between list and detail views. Those patterns map directly onto an RSS client: one route lists items, another expands a single entry.\n\nUse this sample feed UI to rehearse that flow with local data before live feeds arrive in Assessment 2.",
    author: "Subject Coordinator",
    pubDate: "2026-07-22T08:30:00.000Z",
    source: "CSE2/CSE5CWA sample",
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
    return parsed;
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
