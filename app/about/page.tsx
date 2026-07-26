import { Collapsible } from "@/components/Collapsible";
import { InfoIcon, PlayIcon, UserIcon } from "@/components/icons";
import { STUDENT } from "@/lib/student";

export default function AboutPage() {
  return (
    <div className="view">
      <header className="view-head">
        <p className="view-kicker">
          <InfoIcon />
          About
        </p>
        <h1 className="sr-only">About</h1>
        <p className="view-lead">
          Project scope, student details, and how the prototype works.
        </p>
      </header>

      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <span className="panel-head-title">
              <UserIcon />
              Student and project
            </span>
            <span>Assessment 1</span>
          </div>
          <div className="panel-body scroll-area">
            <div className="stats-grid" style={{ marginBottom: "0.85rem" }}>
              <div className="stat-cell">
                <p className="stat-value">{STUDENT.name}</p>
                <p className="stat-label">Student name</p>
              </div>
              <div className="stat-cell">
                <p className="stat-value">{STUDENT.studentNumber}</p>
                <p className="stat-label">Student number</p>
              </div>
            </div>

            <div className="prose prose-muted">
              <p>
                This project is the frontend for an RSS Server that will feed subject
                announcements into an LMS. Assessment 1 is <strong>frontend only</strong>:
                there is no backend feed processing, and sample blog-style content from
                Module 4 Part 2 stands in for live RSS data.
              </p>
              <p>
                Assessment 2 adds the server component and live RSS capability, so
                announcements from multiple subjects can be ingested and surfaced in one
                place instead of scattered across email.
              </p>
            </div>
          </div>
        </section>

        <div className="view-body">
          <section className="panel" style={{ flex: 1 }}>
            <div className="panel-head">
              <span className="panel-head-title">
                <PlayIcon />
                How to use this website
              </span>
            </div>
            <div className="panel-body" style={{ flex: 1, display: "flex" }}>
              <div className="video-frame">
                <div>
                  <PlayIcon />
                  <p style={{ margin: 0 }}>
                    Add <code>public/demo.mp4</code> and swap this placeholder for a video
                    element: open Feeds, create an item, view detail, toggle theme, use the
                    hamburger menu.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <Collapsible title="References (APA 7th)">
            <div className="prose">
              <p>Mozilla Developer Network. (n.d.). <em>ARIA</em>. MDN Web Docs.</p>
              <p>Next.js. (n.d.). <em>App Router documentation</em>. Vercel.</p>
              <p>React. (n.d.). <em>Thinking in React</em>. Meta Open Source.</p>
              <p>W3C. (2024). <em>WCAG 2.2</em>.</p>
              <p>
                Nielsen, J. (1994). Enhancing the explanatory power of usability
                heuristics. <em>CHI Conference Proceedings</em>.
              </p>
            </div>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
