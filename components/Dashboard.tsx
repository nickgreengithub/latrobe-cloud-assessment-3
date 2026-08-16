"use client";

import { useCallback, useEffect, useState } from "react";
import { getDashboard, type Dashboard as DashboardData } from "@/lib/api";
import { MetricBar } from "@/components/MetricBar";

/**
 * The operational dashboard.
 *
 * Everything on screen comes from one /api/dashboard call, so no two panels
 * can disagree about when they were measured. It refreshes on a timer because
 * the point of the view is watching numbers move while the system is used —
 * a static snapshot would not show that the counters are live.
 */

const WINDOWS = [
  { value: "15m", label: "15 min" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
] as const;

const REFRESH_MS = 10_000;

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTime(iso: string | null) {
  if (!iso) return "never";
  return new Date(iso).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** 2xx green, 4xx amber, 5xx red — the same reading as any access log. */
function statusTone(code: number) {
  if (code >= 500) return "bad";
  if (code >= 400) return "warn";
  return "good";
}

export default function Dashboard({
  initial,
  initialWindow,
}: {
  initial: DashboardData;
  initialWindow: string;
}) {
  // Seeded from the server render, so there is no loading state to design and
  // no empty first paint.
  const [data, setData] = useState<DashboardData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState<string>(initialWindow);
  const [live, setLive] = useState(true);

  // The window is passed in rather than read from state, so this callback has
  // no dependencies and the polling interval is never torn down and rebuilt
  // merely because a fetch completed.
  const load = useCallback(async (window: string) => {
    try {
      const next = await getDashboard(window);
      setData(next);
      setError(null);
    } catch (cause) {
      // A failed refresh keeps the last good numbers on screen rather than
      // blanking the dashboard — stale data beats no data when diagnosing.
      setError(cause instanceof Error ? cause.message : "Could not reach the server");
    }
  }, []);

  // Changing the window is a user action, so it fetches from the event
  // handler. Fetching from an effect instead would make the render itself
  // responsible for a side effect that only ever follows a click.
  const chooseWindow = useCallback(
    (next: string) => {
      setSince(next);
      void load(next);
    },
    [load],
  );

  // The only effect: subscribing to a timer, which is exactly what effects
  // are for. setState happens in the interval callback, not in the body.
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => void load(since), REFRESH_MS);
    return () => clearInterval(timer);
  }, [live, load, since]);

  const healthy = data.health.database.status === "connected";
  const maxFeedRequests = Math.max(1, ...data.byFeed.map((f) => f.requests));
  const maxEndpoint = Math.max(1, ...data.byEndpoint.map((e) => e.count));
  const maxClient = Math.max(1, ...data.byClient.map((c) => c.requests));
  const maxStatus = Math.max(1, ...data.byStatus.map((s) => s.count));

  return (
    <div className="dashboard">
      {/* ---- Controls ---- */}
      <div className="dashboard-controls">
        <div className="window-picker" role="group" aria-label="Reporting window">
          {WINDOWS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`window-option${since === option.value ? " active" : ""}`}
              aria-pressed={since === option.value}
              onClick={() => chooseWindow(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="dashboard-controls-right">
          <span className="muted small">
            Updated {formatTime(data.generatedAt)}
          </span>
          <button
            type="button"
            className={`live-toggle${live ? " active" : ""}`}
            aria-pressed={live}
            onClick={() => setLive((value) => !value)}
          >
            <span className={`live-dot${live ? " pulsing" : ""}`} aria-hidden="true" />
            {live ? "Live" : "Paused"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="dashboard-stale" role="status">
          Showing the last successful reading — refresh failed: {error}
        </p>
      ) : null}

      {/* ---- Health ---- */}
      <section className="panel" aria-labelledby="health-heading">
        <div className="panel-head">
          <span className="panel-head-title" id="health-heading">
            System health
          </span>
          <span className={`health-pill ${healthy ? "good" : "bad"}`}>
            {healthy ? "Healthy" : "Degraded"}
          </span>
        </div>
        <div className="panel-body">
          <div className="stats-grid">
            <div className="stat-cell">
              <p className="stat-value">{data.health.status}</p>
              <p className="stat-label">/health status</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{formatDuration(data.health.uptimeSeconds)}</p>
              <p className="stat-label">Uptime</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{data.health.database.status}</p>
              <p className="stat-label">Database</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{data.health.database.latencyMs} ms</p>
              <p className="stat-label">DB latency</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Alerts ---- */}
      <section className="panel" aria-labelledby="alerts-heading">
        <div className="panel-head">
          <span className="panel-head-title" id="alerts-heading">
            Alerts
          </span>
          <span className="muted small">rule-based</span>
        </div>
        <div className="panel-body tight">
          <ul className="alert-list">
            {data.alerts.map((alert, index) => (
              <li key={`${alert.title}-${index}`} className={`alert ${alert.level}`}>
                <span className="alert-level">{alert.level}</span>
                <div>
                  <p className="alert-title">{alert.title}</p>
                  <p className="alert-detail">{alert.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Operational totals ---- */}
      <section className="panel" aria-labelledby="totals-heading">
        <div className="panel-head">
          <span className="panel-head-title" id="totals-heading">
            Operational metrics
          </span>
          <span className="muted small">window: {data.window}</span>
        </div>
        <div className="panel-body">
          <div className="stats-grid">
            <div className="stat-cell">
              <p className="stat-value">{data.totals.requests.toLocaleString()}</p>
              <p className="stat-label">Total requests</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">
                {data.totals.requestsInWindow.toLocaleString()}
              </p>
              <p className="stat-label">In window</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{data.totals.uniqueClients}</p>
              <p className="stat-label">Unique clients</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{data.totals.feedPolls.toLocaleString()}</p>
              <p className="stat-label">Feed polls</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{data.totals.itemsServed.toLocaleString()}</p>
              <p className="stat-label">Items served</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{data.content.feeds}</p>
              <p className="stat-label">RSS channels</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{data.totals.averageDurationMs} ms</p>
              <p className="stat-label">Average response</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{data.totals.slowestDurationMs} ms</p>
              <p className="stat-label">Slowest response</p>
            </div>
            <div className="stat-cell">
              <p className="stat-value">{data.totals.errorRate}%</p>
              <p className="stat-label">Error rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Per-feed reporting ---- */}
      <section className="panel" aria-labelledby="feeds-heading">
        <div className="panel-head">
          <span className="panel-head-title" id="feeds-heading">
            Requests per feed
          </span>
        </div>
        <div className="panel-body">
          {data.byFeed.map((feed) => (
            <MetricBar
              key={feed.slug}
              label={feed.title}
              value={feed.requests}
              max={maxFeedRequests}
              detail={`req · ${feed.itemsServed} items`}
              tone={feed.errors > 0 ? "danger" : "accent"}
            />
          ))}
        </div>
      </section>

      {/* ---- Feed status table ---- */}
      <section className="panel" aria-labelledby="feed-status-heading">
        <div className="panel-head">
          <span className="panel-head-title" id="feed-status-heading">
            Feed status
          </span>
        </div>
        <div className="panel-body tight">
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Each RSS channel with its stored post count, poll count, most
                recent delivery and any error.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Channel</th>
                  <th scope="col">Posts</th>
                  <th scope="col">Polls</th>
                  <th scope="col">Last items</th>
                  <th scope="col">Last polled</th>
                  <th scope="col">State</th>
                </tr>
              </thead>
              <tbody>
                {data.byFeed.map((feed) => {
                  const state = feed.lastError
                    ? "error"
                    : feed.polls === 0
                      ? "idle"
                      : feed.lastItemCount === 0
                        ? "empty"
                        : "serving";
                  return (
                    <tr key={feed.slug}>
                      <th scope="row">
                        <span className="feed-name">{feed.title}</span>
                        <code className="feed-slug">
                          {feed.slug === "__all__" ? "/rss" : `/rss/${feed.slug}`}
                        </code>
                      </th>
                      <td>{feed.postCount}</td>
                      <td>{feed.polls}</td>
                      <td>{feed.lastItemCount ?? "—"}</td>
                      <td>{formatTime(feed.lastPolledAt)}</td>
                      <td>
                        <span className={`state-pill ${state}`}>{state}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- Endpoints, clients, statuses ---- */}
      <div className="dashboard-split">
        <section className="panel" aria-labelledby="endpoints-heading">
          <div className="panel-head">
            <span className="panel-head-title" id="endpoints-heading">
              Requests per endpoint
            </span>
          </div>
          <div className="panel-body">
            {data.byEndpoint.length ? (
              data.byEndpoint.map((endpoint) => (
                <MetricBar
                  key={endpoint.path}
                  label={endpoint.path}
                  value={endpoint.count}
                  max={maxEndpoint}
                  detail={`req · ${endpoint.averageDurationMs} ms avg`}
                />
              ))
            ) : (
              <p className="muted">No requests recorded in this window.</p>
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="clients-heading">
          <div className="panel-head">
            <span className="panel-head-title" id="clients-heading">
              Requests per client
            </span>
          </div>
          <div className="panel-body">
            {data.byClient.length ? (
              data.byClient.map((client) => (
                <MetricBar
                  key={client.clientKey}
                  label={client.clientKey.slice(0, 8)}
                  value={client.requests}
                  max={maxClient}
                  detail={`req · last ${formatTime(client.lastSeenAt)}`}
                />
              ))
            ) : (
              <p className="muted">No identified clients in this window.</p>
            )}
            <p className="panel-note">
              Clients are identified by a hash of address and user-agent, so the
              count is real without the server storing who anyone is.
            </p>
          </div>
        </section>
      </div>

      <div className="dashboard-split">
        <section className="panel" aria-labelledby="status-heading">
          <div className="panel-head">
            <span className="panel-head-title" id="status-heading">
              Response codes
            </span>
          </div>
          <div className="panel-body">
            {data.byStatus.map((status) => (
              <MetricBar
                key={status.statusCode}
                label={String(status.statusCode)}
                value={status.count}
                max={maxStatus}
                detail="responses"
                tone={status.statusCode >= 400 ? "danger" : "accent"}
              />
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="content-heading">
          <div className="panel-head">
            <span className="panel-head-title" id="content-heading">
              Stored content
            </span>
          </div>
          <div className="panel-body">
            <div className="stats-grid">
              <div className="stat-cell">
                <p className="stat-value">{data.content.posts}</p>
                <p className="stat-label">Posts</p>
              </div>
              <div className="stat-cell">
                <p className="stat-value">{data.content.published}</p>
                <p className="stat-label">Published</p>
              </div>
              <div className="stat-cell">
                <p className="stat-value">{data.content.drafts}</p>
                <p className="stat-label">Drafts</p>
              </div>
              <div className="stat-cell">
                <p className="stat-value">{data.content.authors}</p>
                <p className="stat-label">Authors</p>
              </div>
              <div className="stat-cell">
                <p className="stat-value">{data.content.subscribers}</p>
                <p className="stat-label">Subscribers</p>
              </div>
              <div className="stat-cell">
                <p className="stat-value">{data.totals.subscriberPolls}</p>
                <p className="stat-label">Subscriber polls</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ---- Recent activity ---- */}
      <section className="panel" aria-labelledby="recent-heading">
        <div className="panel-head">
          <span className="panel-head-title" id="recent-heading">
            Recent activity
          </span>
          <span className="muted small">newest first</span>
        </div>
        <div className="panel-body tight">
          <ul className="activity-list">
            {data.recent.map((entry, index) => (
              <li key={`${entry.createdAt}-${index}`} className="activity-row">
                <span className={`status-chip ${statusTone(entry.statusCode)}`}>
                  {entry.statusCode}
                </span>
                <span className="activity-method">{entry.method}</span>
                <code className="activity-path">{entry.path}</code>
                <span className="activity-time">{entry.durationMs} ms</span>
                <span className="activity-time muted">
                  {formatTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
