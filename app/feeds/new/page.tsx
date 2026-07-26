import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedForm } from "@/components/FeedForm";

export default function NewFeedPage() {
  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Feeds", href: "/feeds" },
          { label: "Create" },
        ]}
      />

      <section className="page-hero">
        <p className="page-kicker">Create</p>
        <h2 className="page-title">Draft a local feed item</h2>
        <p className="page-lead">
          Assessment 1 stand-in for “create RSS entry”. Items persist in local storage and
          open on a dynamic detail page — ready to be replaced by server-backed RSS in
          Assessment 2.
        </p>
      </section>

      <FeedForm />
    </div>
  );
}
