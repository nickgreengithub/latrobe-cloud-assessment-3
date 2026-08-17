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
            <span>Assessment 2</span>
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
                Assessment 2 adds the server behind that interface. Posts are stored in
                SQLite through Prisma, created and edited over a REST API, and published
                as RSS 2.0 at <code>/rss</code> and <code>/rss/[channel]</code>. The whole
                server runs in a Docker container, and the RSS Client page subscribes to
                it exactly as an LMS would.
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
              <p className="inline-note">
                Observability, testing and reporting (Assessment 3)
              </p>
              <p>
                Beyer, B., Jones, C., Petoff, J., &amp; Murphy, N. R. (2016).{" "}
                <em>Site reliability engineering: How Google runs production
                systems</em>. O&rsquo;Reilly Media.
              </p>
              <p>
                OpenTelemetry Authors. (n.d.). <em>Traces</em>. OpenTelemetry
                Documentation. https://opentelemetry.io/docs/concepts/signals/traces/
              </p>
              <p>
                Prometheus Authors. (n.d.). <em>Metric and label naming</em>.
                Prometheus Documentation.
                https://prometheus.io/docs/practices/naming/
              </p>
              <p>
                Few, S. (2006). <em>Information dashboard design: The effective
                visual communication of data</em>. O&rsquo;Reilly Media.
              </p>
              <p>
                Apache Software Foundation. (n.d.). <em>Apache JMeter user
                manual</em>. https://jmeter.apache.org/usermanual/
              </p>
              <p>
                Google. (n.d.). <em>Lighthouse</em>. Chrome for Developers.
                https://developer.chrome.com/docs/lighthouse/
              </p>
              <p className="inline-note">Backend, data and deployment (Assessment 2)</p>
              <p>
                Docker Inc. (n.d.). <em>Best practices for writing Dockerfiles</em>.
                Docker Documentation. https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
              </p>
              <p>
                Fielding, R. T., Nottingham, M., &amp; Reschke, J. (2022).{" "}
                <em>HTTP semantics</em> (RFC 9110). Internet Engineering Task Force.
                https://doi.org/10.17487/RFC9110
              </p>
              <p>
                Prisma Data, Inc. (n.d.). <em>Prisma ORM: Data modelling and
                relations</em>. Prisma Documentation. https://www.prisma.io/docs
              </p>
              <p>
                RSS Advisory Board. (2009). <em>RSS 2.0 specification</em>.
                https://www.rssboard.org/rss-specification
              </p>
              <p>
                Codd, E. F. (1970). A relational model of data for large shared data
                banks. <em>Communications of the ACM, 13</em>(6), 377&ndash;387.
                https://doi.org/10.1145/362384.362685
              </p>
              <p>
                Hipp, D. R. (n.d.). <em>SQLite: Appropriate uses for SQLite</em>.
                SQLite Documentation. https://www.sqlite.org/whentouse.html
              </p>

              <p className="inline-note">Frontend and usability (Assessment 1)</p>
              <p>
                Mozilla Developer Network. (n.d.). <em>ARIA</em>. MDN Web Docs.
                https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA
              </p>
              <p>
                Vercel Inc. (n.d.). <em>Next.js App Router documentation</em>.
                https://nextjs.org/docs/app
              </p>
              <p>Meta Open Source. (n.d.). <em>Thinking in React</em>. https://react.dev/learn/thinking-in-react</p>
              <p>
                World Wide Web Consortium. (2023). <em>Web Content Accessibility
                Guidelines (WCAG) 2.2</em>. https://www.w3.org/TR/WCAG22/
              </p>
              <p>
                Nielsen, J. (1994). Enhancing the explanatory power of usability
                heuristics. In <em>Proceedings of the SIGCHI Conference on Human
                Factors in Computing Systems</em> (pp. 152&ndash;158). ACM.
                https://doi.org/10.1145/191666.191729
              </p>
            </div>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
