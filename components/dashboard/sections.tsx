"use client";

import type { Dashboard } from "@/lib/api";
import { MetricBar } from "@/components/MetricBar";
import { KpiTile } from "@/components/dashboard/KpiTile";
import { PulseChart } from "@/components/dashboard/PulseChart";
import { formatTime } from "@/lib/format";

/**
 * The four dashboard sections.
 *
 * Each one fills the stage on its own rather than stacking into a single
 * scrolling column: an operational dashboard is something you glance at, and
 * a figure below the fold is a figure nobody reads. Panels that can grow
 * without limit — the feed table, the activity list — scroll inside
 * themselves, so the page never does.
 */

export type SectionId = "overview" | "feeds" | "clients" | "traffic";

export { formatTime };

function formatUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  return `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

/** 2xx good, 4xx warning, 5xx bad — the same reading as any access log. */
function statusTone(code: number) {
  if (code >= 500) return "bad";
  if (code >= 400) return "warn";
  return "good";
}

function Panel({
  title,
  aside,
  children,
  scroll = false,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  return (
    <section className="panel dash-panel" aria-label={title}>
      <div className="panel-head">
        <span className="panel-head-title">{title}</span>
        {aside ? <span className="muted small">{aside}</span> : null}
      </div>
      <div className={`panel-body tight${scroll ? " scroll-area" : ""}`}>
        {children}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Overview

export function OverviewSection({
  data,
  onOpen,
}: {
  data: Dashboard;
  onOpen: (section: SectionId) => void;
}) {
  const healthy = data.health.database.status === "connected";
  const worstAlert = data.alerts[0];

  return (
    <div className="dash-grid overview">
      <div className="kpi-row">
        <KpiTile
          label="Health"
          value={healthy ? "Healthy" : "Degraded"}
          detail={`up ${formatUptime(data.health.uptimeSeconds)} · db ${data.health.database.latencyMs} ms`}
          tone={healthy ? "ok" : "bad"}
        />
        <KpiTile
          label="Requests"
          value={data.totals.requestsInWindow}
          detail={`${data.totals.requests.toLocaleString()} all time`}
          onOpen={() => onOpen("traffic")}
          opensLabel="Opens the traffic breakdown."
        />
        <KpiTile
          label="Unique clients"
          value={data.totals.uniqueClients}
          detail="in window"
          onOpen={() => onOpen("clients")}
          opensLabel="Opens the client breakdown."
        />
        <KpiTile
          label="Feed polls"
          value={data.totals.feedPolls}
          detail={`${data.totals.itemsServed.toLocaleString()} items served`}
          onOpen={() => onOpen("feeds")}
          opensLabel="Opens the feed breakdown."
        />
        <KpiTile
          label="Error rate"
          value={`${data.totals.errorRate}%`}
          detail={`${data.totals.errors} of ${data.totals.requestsInWindow}`}
          tone={
            data.totals.errorRate >= 10
              ? "bad"
              : data.totals.errorRate >= 2
                ? "warn"
                : "ok"
          }
          onOpen={() => onOpen("traffic")}
          opensLabel="Opens the traffic breakdown."
        />
        <KpiTile
          label="Response time"
          value={`${data.totals.averageDurationMs} ms`}
          detail={`peak ${data.totals.slowestDurationMs} ms`}
          tone={data.totals.slowestDurationMs > 1000 ? "warn" : "neutral"}
        />
      </div>

      <Panel title="Activity pulse" aside={`window: ${data.window}`}>
        <PulseChart
          points={data.pulse.points}
          bucketSeconds={data.pulse.bucketSeconds}
        />
      </Panel>

      <Panel
        title="Alerts"
        aside={worstAlert ? worstAlert.level : undefined}
        scroll
      >
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
      </Panel>
    </div>
  );
}

// ------------------------------------------------------------------- Feeds

export function FeedsSection({ data }: { data: Dashboard }) {
  const maxRequests = Math.max(1, ...data.byFeed.map((f) => f.requests));

  return (
    <div className="dash-grid split-2">
      <Panel title="Requests per feed" aside={`window: ${data.window}`} scroll>
        {data.byFeed.map((feed) => (
          <MetricBar
            key={feed.slug}
            label={feed.title}
            value={feed.requests}
            max={maxRequests}
            detail={`req · ${feed.itemsServed} items`}
            tone={feed.errors > 0 ? "danger" : "accent"}
          />
        ))}
      </Panel>

      <Panel title="Feed status" scroll>
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">
              Each RSS channel with its stored post count, polls received, most
              recent delivery and current state.
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
                      {/* State is never colour alone — the word is the label. */}
                      <span className={`state-pill ${state}`}>{state}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

// ----------------------------------------------------------------- Clients

export function ClientsSection({ data }: { data: Dashboard }) {
  const maxClient = Math.max(1, ...data.byClient.map((c) => c.requests));

  return (
    <div className="dash-grid split-2">
      <Panel title="Requests per client" aside={`window: ${data.window}`} scroll>
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
      </Panel>

      <Panel title="Subscribers and identity">
        <div className="stats-grid">
          <div className="stat-cell">
            <p className="stat-value">{data.totals.uniqueClients}</p>
            <p className="stat-label">Unique clients</p>
          </div>
          <div className="stat-cell">
            <p className="stat-value">{data.content.subscribers}</p>
            <p className="stat-label">Registered</p>
          </div>
          <div className="stat-cell">
            <p className="stat-value">{data.totals.subscriberPolls}</p>
            <p className="stat-label">Subscriber polls</p>
          </div>
        </div>
        <p className="panel-note">
          A client is identified by the first 16 characters of a SHA-256 hash of
          its address and user-agent. That is enough to count distinct callers
          and tell them apart over time, and it means the server never stores
          an address it would then have to protect.
        </p>
        <p className="panel-note">
          Registered subscribers are separate: those are clients that identified
          themselves with <code>?subscriber=</code> when polling, so their polls
          are attributed by name rather than by hash.
        </p>
      </Panel>
    </div>
  );
}

// ----------------------------------------------------------------- Traffic

export function TrafficSection({ data }: { data: Dashboard }) {
  const maxEndpoint = Math.max(1, ...data.byEndpoint.map((e) => e.count));
  const maxStatus = Math.max(1, ...data.byStatus.map((s) => s.count));

  return (
    <div className="dash-grid traffic">
      <Panel title="Requests per endpoint" aside={`window: ${data.window}`} scroll>
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
      </Panel>

      <Panel title="Response codes" scroll>
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
        <p className="panel-note">
          Stored content: {data.content.posts} posts ({data.content.published}{" "}
          published, {data.content.drafts} drafts) across {data.content.feeds}{" "}
          channels, by {data.content.authors} authors.
        </p>
      </Panel>

      <Panel title="Recent activity" aside="newest first" scroll>
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
      </Panel>
    </div>
  );
}
