import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

/**
 * Prometheus metrics, exposed at /api/metrics for scraping.
 *
 * These sit alongside the RequestLog/FeedFetch tables rather than replacing
 * them, because the two answer different questions. Prometheus holds cheap
 * counters and latency histograms over time, and is what you query when asking
 * "is the system healthy right now". The database holds the individual rows,
 * and is what the dashboard reads when asking "which feed, which client,
 * which item counts". Deriving per-client breakdowns from Prometheus would
 * mean a label per client, which is the classic cardinality mistake.
 *
 * The registry is stashed on globalThis because Next re-evaluates modules on
 * hot reload in development, and a second Registry would throw on duplicate
 * metric registration.
 */
const globalForProm = globalThis as unknown as {
  promRegistry?: Registry;
  promMetrics?: PromMetrics;
};

export type PromMetrics = {
  requests: Counter<"route" | "method" | "status">;
  duration: Histogram<"route">;
  feedPolls: Counter<"feed" | "status">;
  feedItems: Histogram<"feed">;
  uniqueClients: Gauge<string>;
};

function createRegistry(): { registry: Registry; metrics: PromMetrics } {
  const registry = new Registry();
  registry.setDefaultLabels({ service: "rss-server" });

  // Process-level metrics: heap, event loop lag, CPU. These are what showed
  // the memory ceiling during load testing.
  collectDefaultMetrics({ register: registry, prefix: "rss_" });

  const metrics: PromMetrics = {
    requests: new Counter({
      name: "rss_requests_total",
      help: "Total HTTP requests handled, by route, method and status class.",
      labelNames: ["route", "method", "status"] as const,
      registers: [registry],
    }),
    duration: new Histogram({
      name: "rss_request_duration_ms",
      help: "Request duration in milliseconds, by route.",
      labelNames: ["route"] as const,
      // Bucketed for a small SQLite-backed app: most responses land under
      // 50ms, and anything past 1s is worth seeing separately.
      buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500],
      registers: [registry],
    }),
    feedPolls: new Counter({
      name: "rss_feed_polls_total",
      help: "RSS feed deliveries, by channel and status code.",
      labelNames: ["feed", "status"] as const,
      registers: [registry],
    }),
    feedItems: new Histogram({
      name: "rss_feed_items",
      help: "Number of items served in each feed delivery.",
      labelNames: ["feed"] as const,
      buckets: [0, 1, 5, 10, 20, 50],
      registers: [registry],
    }),
    uniqueClients: new Gauge({
      name: "rss_unique_clients",
      help: "Distinct clients seen, counted from RequestLog.clientKey.",
      registers: [registry],
    }),
  };

  return { registry, metrics };
}

if (!globalForProm.promRegistry || !globalForProm.promMetrics) {
  const created = createRegistry();
  globalForProm.promRegistry = created.registry;
  globalForProm.promMetrics = created.metrics;
}

export const promRegistry = globalForProm.promRegistry;
export const promMetrics = globalForProm.promMetrics;

/**
 * Collapses a concrete path into a route label.
 *
 * /rss/careers and /rss/events must both become /rss/[slug]. Using the raw
 * path would create an unbounded set of label values — one per channel, one
 * per post id — which is what makes a Prometheus instance fall over.
 */
export function routeLabel(pathname: string): string {
  if (/^\/rss\/[^/]+\/?$/.test(pathname)) return "/rss/[slug]";
  const api = /^(\/api\/[a-z]+)\/[^/]+\/?$/.exec(pathname);
  if (api) return `${api[1]}/[id]`;
  return pathname;
}
