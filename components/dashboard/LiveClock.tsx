"use client";

import { useEffect, useState } from "react";
import { TIME_ZONE_LABEL, formatClockFrom } from "@/lib/format";

/**
 * A clock that ticks every second, and how long ago the data was read.
 *
 * This is its own component for one reason: it re-renders once a second, and
 * the dashboard around it must not. Holding this state in the Dashboard
 * component would re-render the chart, both tables and every panel sixty
 * times a minute — which is exactly the main-thread cost that had to be
 * removed from this page once already. React only re-renders from the state
 * owner down, so keeping the tick in a leaf keeps the work proportional to
 * what actually changes: two spans of text.
 *
 * The seconds are the point. A figure that only changes when data arrives
 * looks the same whether the system is being watched or has quietly stopped;
 * a second hand says the page is still counting.
 */

export function LiveClock({
  generatedAt,
  live,
}: {
  generatedAt: string;
  live: boolean;
}) {
  // Seeded from the server-rendered timestamp rather than from Date.now().
  // Reading the clock during render would produce one value on the server and
  // a different one in the browser, which is a hydration mismatch — and the
  // first tick corrects it a second later anyway.
  const [now, setNow] = useState(() => new Date(generatedAt).getTime());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const readAt = new Date(generatedAt).getTime();
  const ageSeconds = Math.max(0, Math.round((now - readAt) / 1000));

  return (
    <span className="dash-clock">
      {/*
        aria-hidden and its own polite live region: announcing a new time
        every second would make a screen reader unusable. The reading age
        below is the part worth hearing, and only when it goes stale.
      */}
      <span className="dash-clock-time" aria-hidden="true">
        {formatClockFrom(now)}
      </span>
      <span className="dash-clock-zone" aria-hidden="true">{TIME_ZONE_LABEL}</span>
      <span className={`dash-clock-age${ageSeconds > 30 ? " stale" : ""}`}>
        <span className="sr-only">Data last read </span>
        {live ? `${ageSeconds}s ago` : "paused"}
      </span>
    </span>
  );
}
