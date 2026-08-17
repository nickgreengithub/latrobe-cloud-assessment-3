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
      {/*
        No view-lead here, unlike the other pages. The dashboard's own bar
        carries the section nav, the window filter and the live indicator in
        the row a sentence of prose would otherwise occupy — on a view whose
        whole purpose is fitting in one screen, height spent describing the
        page is height taken from the page.
      */}
      <header className="view-head compact">
        <p className="view-kicker">
          <GaugeIcon />
          Dashboard
        </p>
        <h1 className="sr-only">Operational dashboard</h1>
      </header>
      <div className="view-body dash-body">
        <Dashboard initial={initial} initialWindow={DEFAULT_WINDOW} />
      </div>
    </div>
  );
}
