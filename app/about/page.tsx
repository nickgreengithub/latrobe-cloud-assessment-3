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
                This is the admin frontend for an <strong>RSS server</strong>: an admin
                authors <strong>posts</strong>, each filed under a category, which the
                server publishes as RSS feeds. It is <strong>not an aggregator</strong> —
                it creates and categorises feeds rather than collecting external ones.
              </p>
              <p>
                Assessment 1 is frontend and usability only, so posts are held in local
                storage as sample content. In Assessment 2 the server backend is added,
                and these categorised posts are served as RSS to client apps — an LMS
                being one such client.
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
            <div className="panel-body video-panel-body">
              <div className="video-embed">
                <iframe
                  src="https://www.youtube-nocookie.com/embed/Uy48ME4TYAI?rel=0"
                  title="How to use this website — walkthrough"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
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
