import Link from "next/link";
import { Collapsible } from "@/components/Collapsible";

export default function HomePage() {
  return (
    <div className="stack">
      <section className="page-hero">
        <p className="page-kicker">RSS Server · LMS client frontend</p>
        <h2 className="page-title">Surface subject announcements where students already look.</h2>
        <p className="page-lead">
          Assessment 1 is a usability-focused frontend for an RSS Server that will later
          feed into an LMS announcement stream. Sample blog-style posts stand in for live
          feeds so we can refine navigation, themes, and scanning behaviour first.
        </p>
      </section>

      <div className="btn-row">
        <Link className="btn" href="/feeds">
          Browse feeds
        </Link>
        <Link className="btn btn-ghost" href="/feeds/new">
          Create local item
        </Link>
        <Link className="btn btn-ghost" href="/settings">
          Theme settings
        </Link>
      </div>

      <div className="stats-grid" aria-label="Project snapshot">
        <div className="stat-cell">
          <p className="stat-value">A1</p>
          <p className="stat-label">Frontend only</p>
        </div>
        <div className="stat-cell">
          <p className="stat-value">A2</p>
          <p className="stat-label">Live RSS ingest</p>
        </div>
        <div className="stat-cell">
          <p className="stat-value">Local</p>
          <p className="stat-label">Sample storage</p>
        </div>
        <div className="stat-cell">
          <p className="stat-value">Cookie</p>
          <p className="stat-label">Theme preference</p>
        </div>
      </div>

      <Collapsible title="How this maps to the RSS → LMS workflow" defaultOpen>
        <div className="prose" style={{ paddingTop: "0.85rem" }}>
          <p>
            Subjects publish announcements. Instead of drowning in email, those notices are
            modelled as feed items — title, date, summary, body — and listed here for
            scanning.
          </p>
          <p>
            Create a local draft, open the detail view, then imagine Assessment 2 swapping
            localStorage for a real RSS endpoint that the LMS can subscribe to.
          </p>
        </div>
      </Collapsible>

      <div className="grid-2">
        <section className="panel" style={{ padding: "1.1rem" }}>
          <p className="page-kicker">Explore</p>
          <h3 className="feed-title" style={{ marginBottom: "0.55rem" }}>
            Feeds / Posts
          </h3>
          <p className="prose">
            Card-free divider list with dates, summaries, dynamic detail pages, and
            hide/show controls for compact scanning.
          </p>
          <div className="btn-row" style={{ marginTop: "0.85rem" }}>
            <Link className="btn" href="/feeds">
              Open feeds
            </Link>
          </div>
        </section>
        <section className="panel" style={{ padding: "1.1rem" }}>
          <p className="page-kicker">Preferences</p>
          <h3 className="feed-title" style={{ marginBottom: "0.55rem" }}>
            Settings
          </h3>
          <p className="prose">
            Switch light/dark themes (cookie) and compact list layout (local storage).
          </p>
          <div className="btn-row" style={{ marginTop: "0.85rem" }}>
            <Link className="btn" href="/settings">
              Open settings
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
