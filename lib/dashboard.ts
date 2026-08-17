import { prisma } from "@/lib/db";
import { STARTED_AT } from "@/lib/api-response";
import { AGGREGATE_FEED } from "@/lib/metrics";
import { routeLabel } from "@/lib/prom";
import { withSpan } from "@/lib/otel";
import type { Dashboard } from "@/lib/api";

/**
 * Collects everything the reporting view needs, in one pass.
 *
 * This lives apart from the route handler because two callers need it: the
 * /api/dashboard endpoint that the browser polls, and the /dashboard page
 * itself, which renders the first snapshot on the server so the view arrives
 * populated instead of empty-then-filled.
 *
 * The dashboard could instead have called /api/health, /api/count and
 * /api/stats and stitched the results together in the browser, but three
 * round trips that must agree with each other is three chances to render a
 * panel that contradicts the panel beside it. One collection, one point in
 * time.
 *
 * `window` accepts 15m | 1h | 24h | 7d. Anything unrecognised means all time.
 */

const WINDOW_PATTERN = /^(\d+)([mhd])$/;

function parseSince(value: string | null): { since: Date | null; label: string } {
  if (!value) return { since: null, label: "all time" };
  const match = WINDOW_PATTERN.exec(value.trim());
  if (!match) return { since: null, label: "all time" };
  const ms = { m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "m" | "h" | "d"];
  return { since: new Date(Date.now() - Number(match[1]) * ms), label: value.trim() };
}

/** How many points the activity pulse plots across whatever window is chosen. */
const PULSE_BUCKETS = 48;

/**
 * Requests over time, bucketed for the activity chart.
 *
 * Done in SQL rather than by reading rows and counting them in JavaScript.
 * After a load test the table holds tens of thousands of rows for a single
 * window, and pulling them across just to bucket them would make the chart
 * the most expensive thing on the page. Prisma has no expression-level
 * groupBy, so this is one of the few places raw SQL is the right tool —
 * `strftime('%s')` because Prisma stores SQLite DateTimes as ISO text.
 *
 * Empty buckets are filled in afterwards. Without them the line would join
 * across a gap in traffic and draw a slope where nothing actually happened.
 */
async function collectPulse(since: Date | null, until: Date) {
  const from = since ?? new Date(until.getTime() - 60 * 60 * 1000);
  const spanMs = Math.max(60_000, until.getTime() - from.getTime());
  const bucketSeconds = Math.max(1, Math.round(spanMs / PULSE_BUCKETS / 1000));

  // The outer CAST is not decoration. SQLite binds a JavaScript number as
  // REAL, so dividing by a bound parameter gives floating point — the bucket
  // ids come back as 23825770.226 and match no integer bucket at all. The
  // chart renders completely empty and looks like a data problem rather than
  // an arithmetic one.
  const rows = await prisma.$queryRaw<
    { bucket: number; requests: number; errors: number; polls: number }[]
  >`
    SELECT CAST(CAST(strftime('%s', createdAt) AS INTEGER) / CAST(${bucketSeconds} AS INTEGER) AS INTEGER) AS bucket,
           COUNT(*)                                                AS requests,
           SUM(CASE WHEN statusCode >= 400    THEN 1 ELSE 0 END)   AS errors,
           SUM(CASE WHEN feedSlug IS NOT NULL THEN 1 ELSE 0 END)   AS polls
    FROM RequestLog
    WHERE createdAt >= ${from.toISOString()}
    GROUP BY bucket
    ORDER BY bucket
  `;

  const counts = new Map(
    rows.map((row) => [
      Number(row.bucket),
      {
        requests: Number(row.requests),
        errors: Number(row.errors),
        polls: Number(row.polls),
      },
    ]),
  );

  // Anchor the series on the current bucket and count backwards, so the
  // right-hand edge of the chart is always now. Anchoring on `from` instead
  // leaves the newest traffic one bucket past the end of the axis — the
  // counters move while the chart appears not to.
  const lastBucket = Math.floor(until.getTime() / 1000 / bucketSeconds);
  const firstBucket = lastBucket - (PULSE_BUCKETS - 1);
  const points = [];
  for (let i = 0; i < PULSE_BUCKETS; i++) {
    const bucket = firstBucket + i;
    const found = counts.get(bucket);
    points.push({
      at: new Date(bucket * bucketSeconds * 1000).toISOString(),
      requests: found?.requests ?? 0,
      errors: found?.errors ?? 0,
      polls: found?.polls ?? 0,
    });
  }

  return { bucketSeconds, points };
}

/**
 * Collapses concrete paths into the routes that served them.
 *
 * The request log stores what was actually requested, which is right — it is
 * a log. But grouping the report by that raw path lists every post id and
 * every channel slug as its own endpoint, so "requests per endpoint" became
 * a dozen rows of /api/posts/cmswemnzo000s8… each with a handful of hits,
 * while the route they all belong to appeared nowhere. Merging them by route
 * pattern answers the question the panel is actually asking.
 *
 * Averages are re-weighted by count when rows merge; averaging the averages
 * would let one request to a slow id outweigh a hundred fast ones.
 */
function groupByRoute(
  rows: { path: string; _count: number; _avg?: { durationMs: number | null } }[],
) {
  const merged = new Map<string, { count: number; totalMs: number }>();

  for (const row of rows) {
    const route = routeLabel(row.path);
    const existing = merged.get(route) ?? { count: 0, totalMs: 0 };
    existing.count += row._count;
    existing.totalMs += (row._avg?.durationMs ?? 0) * row._count;
    merged.set(route, existing);
  }

  return [...merged.entries()]
    .map(([path, value]) => ({
      path,
      count: value.count,
      averageDurationMs: value.count ? Math.round(value.totalMs / value.count) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

/** A feed that has been polled but served nothing is the interesting case. */
type FeedRow = {
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

export async function collectDashboard(window: string | null): Promise<Dashboard> {
  const { since, label } = parseSince(window);
  const requestWhere = since ? { createdAt: { gte: since } } : {};

  // Database reachability is measured, not assumed — the same probe
  // /api/health uses, so the two can never disagree on screen.
  const dbStartedAt = Date.now();
  let databaseStatus: "connected" | "unreachable" = "connected";
  let databaseLatencyMs = 0;
  try {
    await withSpan("dashboard.db_probe", {}, async () => {
      await prisma.$queryRaw`SELECT 1`;
    });
    databaseLatencyMs = Date.now() - dbStartedAt;
  } catch {
    databaseStatus = "unreachable";
  }

  const [
    totalRequests,
    windowedRequests,
    errorRequests,
    timing,
    byEndpoint,
    byStatus,
    distinctClients,
    recentRequests,
    feeds,
    feedRequestGroups,
    feedFetchGroups,
    recentFetches,
    posts,
    publishedPosts,
    authors,
    subscribers,
    subscriberPolls,
  ] = await withSpan("dashboard.aggregate", { "rss.window": label }, () =>
    prisma.$transaction([
      prisma.requestLog.count(),
      prisma.requestLog.count({ where: requestWhere }),
      prisma.requestLog.count({
        where: { ...requestWhere, statusCode: { gte: 400 } },
      }),
      prisma.requestLog.aggregate({
        where: requestWhere,
        _avg: { durationMs: true },
        _max: { durationMs: true },
      }),
      prisma.requestLog.groupBy({
        by: ["path"],
        where: requestWhere,
        _count: true,
        _avg: { durationMs: true },
        orderBy: { _count: { path: "desc" } },
        // No take here: the rows are merged by route below, so truncating
        // first would drop hits that belong to a route that survives.
      }),
      prisma.requestLog.groupBy({
        by: ["statusCode"],
        where: requestWhere,
        _count: true,
        orderBy: { statusCode: "asc" },
      }),
      // Per-client rollup. clientKey is a hash, so this counts distinct
      // callers without the dashboard ever handling an address.
      prisma.requestLog.groupBy({
        by: ["clientKey"],
        where: { ...requestWhere, clientKey: { not: null } },
        _count: true,
        _max: { createdAt: true },
        orderBy: { _count: { clientKey: "desc" } },
        take: 10,
      }),
      prisma.requestLog.findMany({
        where: requestWhere,
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          method: true,
          path: true,
          statusCode: true,
          durationMs: true,
          createdAt: true,
          feedSlug: true,
        },
      }),
      prisma.feed.findMany({
        orderBy: { slug: "asc" },
        include: { _count: { select: { posts: true } } },
      }),
      prisma.requestLog.groupBy({
        by: ["feedSlug"],
        where: { ...requestWhere, feedSlug: { not: null } },
        _count: true,
        _avg: { durationMs: true },
      }),
      prisma.feedFetch.groupBy({
        by: ["feedSlug"],
        where: requestWhere,
        _count: true,
        _sum: { itemCount: true },
        _max: { createdAt: true },
      }),
      prisma.feedFetch.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          feedSlug: true,
          statusCode: true,
          itemCount: true,
          error: true,
          createdAt: true,
        },
      }),
      prisma.post.count(),
      prisma.post.count({ where: { status: "published" } }),
      prisma.author.count(),
      prisma.subscriber.count(),
      prisma.subscriber.aggregate({ _sum: { pollCount: true } }),
    ]),
  );

  const requestsByFeed = new Map(feedRequestGroups.map((r) => [r.feedSlug, r]));
  const fetchesByFeed = new Map(feedFetchGroups.map((r) => [r.feedSlug, r]));

  /** Most recent delivery per channel, for the status column. */
  const latestFetch = new Map<string, (typeof recentFetches)[number]>();
  for (const fetch of recentFetches) {
    if (!latestFetch.has(fetch.feedSlug)) latestFetch.set(fetch.feedSlug, fetch);
  }

  function buildFeedRow(slug: string, title: string, postCount: number): FeedRow {
    const requests = requestsByFeed.get(slug);
    const fetches = fetchesByFeed.get(slug);
    const latest = latestFetch.get(slug);
    const errors = recentFetches.filter(
      (f) => f.feedSlug === slug && f.statusCode >= 400,
    ).length;

    return {
      slug,
      title,
      postCount,
      requests: requests?._count ?? 0,
      polls: fetches?._count ?? 0,
      itemsServed: fetches?._sum.itemCount ?? 0,
      errors,
      averageDurationMs: Math.round(requests?._avg?.durationMs ?? 0),
      lastPolledAt: (fetches?._max.createdAt ?? null)?.toISOString() ?? null,
      lastItemCount: latest?.itemCount ?? null,
      lastError: latest?.error ?? null,
    };
  }

  /**
   * The aggregate channel is a sibling of the others, not their parent.
   *
   * /rss is its own endpoint that happens to carry every published post; a
   * client polling /rss/careers never touches it. Labelling it "aggregate"
   * and pinning it at the top of the channel list made it read as a total,
   * so a single channel out-polling it looked like a bug rather than what it
   * is — one endpoint being busier than another.
   *
   * Sorting by request count rather than pinning it removes the implied
   * hierarchy, and descending magnitude is the right order for a bar
   * comparison regardless.
   */
  const byFeed: FeedRow[] = [
    buildFeedRow(AGGREGATE_FEED, "All announcements", publishedPosts),
    ...feeds.map((feed) =>
      buildFeedRow(feed.slug, feed.title, feed._count.posts),
    ),
  ].sort((a, b) => b.requests - a.requests || a.title.localeCompare(b.title));

  // Channels that were requested but do not exist. A client polling a
  // mistyped URL forever is invisible unless something says so.
  const knownSlugs = new Set(byFeed.map((row) => row.slug));
  const unknownFeeds = [...fetchesByFeed.keys()]
    .filter((slug) => !knownSlugs.has(slug))
    .map((slug) => ({
      slug,
      polls: fetchesByFeed.get(slug)?._count ?? 0,
    }));

  const uniqueClients = distinctClients.length;
  const errorRate = windowedRequests
    ? Math.round((errorRequests / windowedRequests) * 1000) / 10
    : 0;

  /**
   * Rule-based alerts.
   *
   * Two levels rather than one: a warning is an early signal that something
   * is drifting, and a breach is a state someone has to act on. A single
   * threshold only ever tells you after it is too late.
   */
  const alerts: { level: "critical" | "warning" | "info"; title: string; detail: string }[] =
    [];

  if (databaseStatus === "unreachable") {
    alerts.push({
      level: "critical",
      title: "Database unreachable",
      detail: "The health probe could not query the database. Feeds cannot be served.",
    });
  }
  if (errorRate >= 10) {
    alerts.push({
      level: "critical",
      title: `Error rate ${errorRate}%`,
      detail: `${errorRequests} of ${windowedRequests} requests in the last ${label} returned 4xx or 5xx.`,
    });
  } else if (errorRate >= 2) {
    alerts.push({
      level: "warning",
      title: `Error rate ${errorRate}%`,
      detail: `Early warning: errors are above 2% over the last ${label}.`,
    });
  }
  for (const feed of byFeed) {
    if (feed.polls > 0 && feed.lastItemCount === 0) {
      alerts.push({
        level: "warning",
        title: `${feed.title} served no items`,
        detail: `The channel was polled ${feed.polls} time(s) but its most recent delivery contained zero items.`,
      });
    }
  }
  for (const unknown of unknownFeeds) {
    alerts.push({
      level: "warning",
      title: `Unknown channel /rss/${unknown.slug}`,
      detail: `${unknown.polls} request(s) for a channel that does not exist — likely a misconfigured client.`,
    });
  }
  if (timing._max.durationMs && timing._max.durationMs > 1000) {
    alerts.push({
      level: "warning",
      title: `Slowest response ${timing._max.durationMs} ms`,
      detail: "A request took longer than one second, past the responsiveness budget.",
    });
  }
  if (!alerts.length) {
    alerts.push({
      level: "info",
      title: "All checks passing",
      detail: `Database reachable, error rate ${errorRate}%, every polled channel served items.`,
    });
  }

  const pulse = await withSpan("dashboard.pulse", { "rss.window": label }, () =>
    collectPulse(since, new Date()),
  );

  return {
    generatedAt: new Date().toISOString(),
    window: label,
    pulse,
    health: {
      status: databaseStatus === "connected" ? "healthy" : "degraded",
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
      database: { status: databaseStatus, latencyMs: databaseLatencyMs },
      version: process.env.npm_package_version ?? "3.0.0",
    },
    totals: {
      requests: totalRequests,
      requestsInWindow: windowedRequests,
      errors: errorRequests,
      errorRate,
      uniqueClients,
      feedPolls: byFeed.reduce((sum, f) => sum + f.polls, 0),
      itemsServed: byFeed.reduce((sum, f) => sum + f.itemsServed, 0),
      averageDurationMs: Math.round(timing._avg.durationMs ?? 0),
      slowestDurationMs: timing._max.durationMs ?? 0,
      subscriberPolls: subscriberPolls._sum.pollCount ?? 0,
    },
    content: {
      feeds: feeds.length,
      posts,
      published: publishedPosts,
      drafts: posts - publishedPosts,
      authors,
      subscribers,
    },
    byFeed,
    byEndpoint: groupByRoute(byEndpoint),
    byStatus: byStatus.map((row) => ({
      statusCode: row.statusCode,
      count: row._count,
    })),
    byClient: distinctClients.map((row) => ({
      clientKey: row.clientKey ?? "unknown",
      requests: row._count,
      lastSeenAt: row._max.createdAt?.toISOString() ?? null,
    })),
    recent: recentRequests.map((row) => ({
      method: row.method,
      path: row.path,
      statusCode: row.statusCode,
      durationMs: row.durationMs,
      feedSlug: row.feedSlug,
      createdAt: row.createdAt.toISOString(),
    })),
    alerts,
  };
}
