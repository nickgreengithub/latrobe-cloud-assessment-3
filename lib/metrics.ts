import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { promMetrics, routeLabel } from "@/lib/prom";
import { annotateSpan } from "@/lib/otel";

/**
 * Request and feed telemetry, shared by the API route wrapper and the RSS
 * routes.
 *
 * Assessment 2 wrote RequestLog rows from inside `handle()` in
 * lib/api-response.ts, which meant only /api/* was ever counted. The RSS
 * routes return XML directly and never pass through that wrapper, so every
 * feed poll — the single most important request this server serves — was
 * invisible to the metrics. Pulling the write out to here lets both call
 * sites use it.
 *
 * Every function is fire-and-forget. Telemetry failing must never turn a
 * served feed into an error response.
 */

/** The slug used for the aggregate /rss channel, which has no slug of its own. */
export const AGGREGATE_FEED = "__all__";

/**
 * Identifies a caller without storing who they are.
 *
 * "Unique clients" is a required metric, but an IP address is personal
 * information and this is a university assignment with no reason to retain
 * it. Hashing the address together with the user-agent and keeping the first
 * 16 characters counts distinct callers while making the original values
 * unrecoverable from the database.
 */
export function clientKeyFrom(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const address =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const agent = request.headers.get("user-agent") ?? "unknown";
  return createHash("sha256").update(`${address}|${agent}`).digest("hex").slice(0, 16);
}

/** Returns the feed slug a path is serving, or null if it is not a feed path. */
export function feedSlugFromPath(pathname: string): string | null {
  if (pathname === "/rss") return AGGREGATE_FEED;
  const match = /^\/rss\/([^/]+)\/?$/.exec(pathname);
  return match ? match[1] : null;
}

/**
 * Records one request everywhere it needs to go: a RequestLog row for the
 * dashboard's per-feed and per-client breakdowns, Prometheus counters for the
 * time series, and attributes on the active trace span so a slow request in
 * Jaeger says which feed it was serving. Never throws.
 */
export function recordRequest(
  request: Request,
  statusCode: number,
  startedAt: number,
): void {
  const { pathname } = new URL(request.url);
  const durationMs = Date.now() - startedAt;
  const route = routeLabel(pathname);

  try {
    promMetrics.requests.inc({
      route,
      method: request.method,
      status: String(statusCode),
    });
    promMetrics.duration.observe({ route }, durationMs);
    annotateSpan({
      "rss.route": route,
      "rss.status_code": statusCode,
      "rss.duration_ms": durationMs,
    });
  } catch {
    // Telemetry must never break the response.
  }

  void prisma.requestLog
    .create({
      data: {
        method: request.method,
        path: pathname,
        statusCode,
        durationMs,
        userAgent: request.headers.get("user-agent"),
        feedSlug: feedSlugFromPath(pathname),
        clientKey: clientKeyFrom(request),
      },
    })
    .catch(() => {});
}

/** Writes one FeedFetch row describing what a feed delivery actually returned. */
export function recordFeedFetch(input: {
  feedSlug: string;
  statusCode: number;
  itemCount?: number;
  durationMs?: number;
  error?: string | null;
  clientKey?: string | null;
}): void {
  try {
    promMetrics.feedPolls.inc({
      feed: input.feedSlug,
      status: String(input.statusCode),
    });
    promMetrics.feedItems.observe({ feed: input.feedSlug }, input.itemCount ?? 0);
    annotateSpan({
      "rss.feed": input.feedSlug,
      "rss.feed.items": input.itemCount ?? 0,
    });
  } catch {
    // As above — a metric must never cost us a feed delivery.
  }

  void prisma.feedFetch
    .create({
      data: {
        feedSlug: input.feedSlug,
        statusCode: input.statusCode,
        itemCount: input.itemCount ?? 0,
        durationMs: input.durationMs ?? 0,
        error: input.error ?? null,
        clientKey: input.clientKey ?? null,
      },
    })
    .catch(() => {});
}
