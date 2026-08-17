"use client";

import { useCallback, useEffect, useState } from "react";
import { getDashboard, type Dashboard as DashboardData } from "@/lib/api";
import { LiveClock } from "@/components/dashboard/LiveClock";
import {
  ClientsSection,
  FeedsSection,
  OverviewSection,
  TrafficSection,
  type SectionId,
} from "@/components/dashboard/sections";

/**
 * The operational dashboard.
 *
 * Everything on screen comes from one /api/dashboard call, so no two panels
 * can disagree about when they were measured. It refreshes on a timer,
 * because the point of the view is watching numbers move while the system is
 * used — a static snapshot would not show that the counters are live.
 *
 * The layout is deliberately a fixed stage rather than a scrolling column.
 * Everything the reader needs is one glance or one click away: the four
 * sections are tabs in the dashboard's own bar, and the overview tiles are
 * themselves buttons into the section that explains them.
 */

const WINDOWS = [
  { value: "15m", label: "15 min" },
  { value: "1h", label: "1 hour" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
] as const;

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "feeds", label: "Feeds" },
  { id: "clients", label: "Clients" },
  { id: "traffic", label: "Traffic" },
];

const REFRESH_MS = 10_000;

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
  const [section, setSection] = useState<SectionId>("overview");
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

  // The only effect: subscribing to a timer, which is what effects are for.
  // setState happens in the interval callback, not in the body.
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => void load(since), REFRESH_MS);
    return () => clearInterval(timer);
  }, [live, load, since]);

  return (
    <div className="dashboard">
      {/*
        The dashboard's own bar. It replaces a line of descriptive prose that
        cost a row of height and told the reader nothing they could act on —
        the controls belong where the prose was.
      */}
      <div className="dash-bar">
        <nav className="dash-nav" aria-label="Dashboard sections">
          {SECTIONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`dash-nav-item${section === entry.id ? " active" : ""}`}
              aria-current={section === entry.id ? "true" : undefined}
              onClick={() => setSection(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        <div className="dash-bar-right">
          {/* Filters in one row, scoping everything below them. */}
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

          {/* Ticks once a second, and is its own component so that tick
              re-renders two spans rather than the whole dashboard. */}
          <LiveClock generatedAt={data.generatedAt} live={live} />

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

      <div className="dash-stage">
        {section === "overview" ? (
          <OverviewSection data={data} onOpen={setSection} live={live} />
        ) : null}
        {section === "feeds" ? <FeedsSection data={data} /> : null}
        {section === "clients" ? <ClientsSection data={data} /> : null}
        {section === "traffic" ? <TrafficSection data={data} /> : null}
      </div>
    </div>
  );
}
