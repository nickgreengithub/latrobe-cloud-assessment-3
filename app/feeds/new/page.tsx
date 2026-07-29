import { FeedForm } from "@/components/FeedForm";
import { PlusIcon } from "@/components/icons";

export default function NewFeedPage() {
  return (
    <div className="view">
      <header className="view-head">
        <p className="view-kicker">
          <PlusIcon />
          Feeds / Create
        </p>
        <h1 className="sr-only">New post</h1>
        <p className="view-lead">
          Posts save to local storage and open on a dynamic detail page.
        </p>
      </header>

      <div className="view-body scroll-area detail-scroll">
        <FeedForm />
      </div>
    </div>
  );
}
