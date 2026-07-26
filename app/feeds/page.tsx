import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Collapsible } from "@/components/Collapsible";
import { FeedList } from "@/components/FeedList";

export default function FeedsPage() {
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Feeds" },
        ]}
      />

      <section className="page-hero">
        <p className="page-kicker">Feeds / Posts</p>
        <h2 className="page-title">Scan announcements like an LMS feed client</h2>
        <p className="page-lead">
          Sample content mirrors Module 4 Part 2 blog posts and is stored locally. Each
          item is shaped for a later RSS workflow: title, date, summary, and a dynamic
          detail route.
        </p>
      </section>

      <div className="btn-row">
        <Link className="btn" href="/feeds/new">
          Create feed item
        </Link>
        <Link className="btn btn-ghost" href="/settings">
          Compact / theme
        </Link>
      </div>

      <Collapsible title="Hide / show — why summaries collapse">
        <div className="prose" style={{ paddingTop: "0.85rem" }}>
          <p>
            Use Settings → Compact feed list to hide summaries for faster scanning. The
            collapsible panels on this site demonstrate explicit show/hide behaviour for
            secondary explanation without cluttering the primary list.
          </p>
        </div>
      </Collapsible>

      <FeedList />
    </div>
  );
}
