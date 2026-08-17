import type { ApiPost, Channel } from "@/lib/types";

/**
 * Typed client for the RSS server's REST API.
 *
 * Everything the frontend knows about the backend goes through here: one place
 * that unwraps the { ok, data, meta, error } envelope and turns a failure into
 * a thrown ApiError, so components handle one error type instead of inspecting
 * response bodies themselves.
 *
 * The base URL is configurable via NEXT_PUBLIC_API_BASE. Empty means same
 * origin; setting it lets the RSS Client page be pointed at a different server.
 */
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = {
  ok: boolean;
  data: T | null;
  meta: { total?: number; page?: number; limit?: number } | null;
  error: { message: string; details: unknown } | null;
};

async function request<T>(path: string, init?: RequestInit): Promise<{ data: T; meta: Envelope<T>["meta"] }> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    // Network-level failure: the server is unreachable, not merely unhappy.
    throw new ApiError("Cannot reach the RSS server. Is it running?", 0);
  }

  let body: Envelope<T>;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(`Server returned a non-JSON response (${response.status})`, response.status);
  }

  if (!response.ok || !body.ok || body.data === null) {
    throw new ApiError(
      body.error?.message ?? `Request failed (${response.status})`,
      response.status,
      body.error?.details,
    );
  }

  return { data: body.data, meta: body.meta };
}

// ---- Posts ----

export type PostQuery = {
  feed?: string;
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export async function listPosts(query: PostQuery = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && value !== "all") {
      params.set(key, String(value));
    }
  }
  const suffix = params.toString() ? `?${params}` : "";
  return request<ApiPost[]>(`/api/posts${suffix}`);
}

export async function getPost(id: string) {
  const { data } = await request<ApiPost>(`/api/posts/${encodeURIComponent(id)}`);
  return data;
}

export type PostInput = {
  title: string;
  summary: string;
  content: string;
  authorName?: string;
  imageUrl?: string;
  feedSlugs: string[];
};

export async function createPost(input: PostInput) {
  const { data } = await request<ApiPost>("/api/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updatePost(id: string, input: Partial<PostInput>) {
  const { data } = await request<ApiPost>(`/api/posts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data;
}

export async function deletePost(id: string) {
  await request<{ deleted: boolean }>(`/api/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ---- Channels ----

export async function listChannels() {
  const { data } = await request<Channel[]>("/api/feeds");
  return data;
}

// ---- Operational ----

export type Health = {
  status: string;
  uptimeSeconds: number;
  database: { status: string; latencyMs: number | null };
  version: string;
  timestamp: string;
};

export async function getHealth() {
  const { data } = await request<Health>("/api/health");
  return data;
}

export async function getStats() {
  const { data } = await request<{
    posts: { total: number; published: number; drafts: number };
    channels: { total: number; breakdown: { slug: string; title: string; postCount: number }[] };
    authors: { total: number; breakdown: { name: string; postCount: number }[] };
    subscribers: { total: number; totalPolls: number };
  }>("/api/stats");
  return data;
}

export async function getCount() {
  const { data } = await request<{
    totalRequests: number;
    averageDurationMs: number;
    byPath: { path: string; count: number; averageDurationMs: number }[];
    byStatus: { statusCode: number; count: number }[];
  }>("/api/count");
  return data;
}

// ---- Dashboard ----

export type AlertLevel = "critical" | "warning" | "info";

export type FeedMetrics = {
  slug: string;
  title: string;
  postCount: number;
  requests: number;
  polls: number;
  itemsServed: number;
  errors: number;
  averageDurationMs: number;
  lastPolledAt: string | null;
  lastItemCount: number | null;
  lastError: string | null;
};

export type PulsePoint = {
  at: string;
  requests: number;
  errors: number;
  polls: number;
};

export type Dashboard = {
  generatedAt: string;
  window: string;
  /** Requests bucketed over the window, for the activity chart. */
  pulse: { bucketSeconds: number; points: PulsePoint[] };
  health: {
    status: string;
    uptimeSeconds: number;
    database: { status: string; latencyMs: number };
    version: string;
  };
  totals: {
    requests: number;
    requestsInWindow: number;
    errors: number;
    errorRate: number;
    uniqueClients: number;
    feedPolls: number;
    itemsServed: number;
    averageDurationMs: number;
    slowestDurationMs: number;
    subscriberPolls: number;
  };
  content: {
    feeds: number;
    posts: number;
    published: number;
    drafts: number;
    authors: number;
    subscribers: number;
  };
  byFeed: FeedMetrics[];
  byEndpoint: { path: string; count: number; averageDurationMs: number }[];
  byStatus: { statusCode: number; count: number }[];
  byClient: { clientKey: string; requests: number; lastSeenAt: string | null }[];
  recent: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    feedSlug: string | null;
    createdAt: string;
  }[];
  alerts: { level: AlertLevel; title: string; detail: string }[];
};

/** The whole reporting view in one request — see app/api/dashboard/route.ts. */
export async function getDashboard(since: string) {
  const { data } = await request<Dashboard>(
    `/api/dashboard?since=${encodeURIComponent(since)}`,
  );
  return data;
}
