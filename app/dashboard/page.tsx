import type { Metadata } from "next";
import Dashboard from "@/components/Dashboard";
import { GaugeIcon } from "@/components/icons";
import { collectDashboard } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — La Trobe RSS Server",
  description:
    "Operational dashboard: health, request and feed metrics, unique clients, alerts and recent activity for the RSS server.",
};

/**
 * Operational metrics are, by definition, never cacheable — a dashboard
 * rendered from a cache is a dashboard reporting the past.
 */
export const dynamic = "force-dynamic";

/** The default reporting window; the client can change it without a reload. */
const DEFAULT_WINDOW = "24h";

export default async function DashboardPage() {
  // Collected on the server so the page arrives with its numbers already in
  // it. The client component takes over from here and keeps them current.
  const initial = await collectDashboard(DEFAULT_WINDOW);

  return (
    <div className="view">
      <header className="view-head">
        <p className="view-kicker">
          <GaugeIcon />
          Dashboard
        </p>
        <h1 className="sr-only">Operational dashboard</h1>
        <p className="view-lead">
          Health, traffic, feed activity and alerts — measured, not estimated.
        </p>
      </header>
      {/*
        The shell keeps the header and footer fixed and scrolls the view body,
        so anything taller than the frame needs this wrapper to be reachable.
      */}
      <div className="view-body scroll-area detail-scroll">
        <Dashboard initial={initial} initialWindow={DEFAULT_WINDOW} />
      </div>
    </div>
  );
}
