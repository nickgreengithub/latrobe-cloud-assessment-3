import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Collapsible } from "@/components/Collapsible";
import { STUDENT } from "@/lib/student";

export default function AboutPage() {
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "About" },
        ]}
      />

      <section className="page-hero">
        <p className="page-kicker">About</p>
        <h2 className="page-title">Frontend prototype for an RSS-fed LMS stream</h2>
        <p className="page-lead">
          This Assessment 1 submission focuses on React/Next.js interface design and
          usability. Backend feed processing and live RSS delivery arrive in Assessment 2.
        </p>
      </section>

      <div className="stats-grid" aria-label="Student details">
        <div className="stat-cell">
          <p className="stat-value" style={{ fontSize: "1rem" }}>
            {STUDENT.name}
          </p>
          <p className="stat-label">Student name</p>
        </div>
        <div className="stat-cell">
          <p className="stat-value" style={{ fontSize: "1rem" }}>
            {STUDENT.studentNumber}
          </p>
          <p className="stat-label">Student number</p>
        </div>
        <div className="stat-cell">
          <p className="stat-value">A1</p>
          <p className="stat-label">Frontend only</p>
        </div>
        <div className="stat-cell">
          <p className="stat-value">Next</p>
          <p className="stat-label">App Router</p>
        </div>
      </div>

      <section className="stack">
        <p className="page-kicker">How to use this website</p>
        <div className="video-frame" role="region" aria-label="How-to video placeholder">
          <p style={{ padding: "1.25rem", textAlign: "center", maxWidth: "28rem" }}>
            Add <code style={{ color: "var(--cyan)" }}>public/demo.mp4</code> then replace
            this placeholder with a video element. Cover: open Feeds, create an item, open
            detail, toggle theme, use the hamburger on a narrow viewport.
          </p>
        </div>
        <p className="inline-note">
          Place a short how-to clip at public/demo.mp4. The marked walkthrough (3–8 min,
          face + student ID) is submitted separately via Moodle.
        </p>
      </section>

      <Collapsible title="Project continuity" defaultOpen>
        <div className="prose" style={{ paddingTop: "0.85rem" }}>
          <p>
            Assessment 1 establishes navigation, theming, accessibility patterns, and a
            Feeds/Posts experience shaped like RSS entries (title, date, summary, body).
          </p>
          <p>
            Assessment 2 will introduce the server component and live RSS capability so
            subject announcements can be ingested and surfaced in an LMS client — reducing
            reliance on overcrowded student email.
          </p>
        </div>
      </Collapsible>

      <Collapsible title="Selected references (APA 7th)">
        <div className="prose" style={{ paddingTop: "0.85rem" }}>
          <p>
            Mozilla Developer Network. (n.d.). <em>ARIA: The Accessible Rich Internet
            Applications suite of web standards</em>. MDN Web Docs.
          </p>
          <p>
            Next.js. (n.d.). <em>App Router documentation</em>. Vercel.
          </p>
          <p>
            React. (n.d.). <em>Thinking in React</em>. Meta Open Source.
          </p>
          <p>
            W3C. (2024). <em>Web Content Accessibility Guidelines (WCAG) 2.2</em>.
          </p>
          <p>
            Nielsen, J. (1994). Enhancing the explanatory power of usability heuristics.
            <em>CHI Conference Proceedings</em>.
          </p>
        </div>
      </Collapsible>
    </div>
  );
}
