import { FeedList } from "@/components/FeedList";
import { RssIcon } from "@/components/icons";

export default function FeedsPage() {
  return (
    <div className="view">
      <header className="view-head">
        <p className="view-kicker">
          <RssIcon />
          Feeds / Posts
        </p>
        <h1 className="sr-only">Feeds / Posts</h1>
        <p className="view-lead">
          Sample announcements, stored locally until live RSS lands in Assessment 2.
        </p>
      </header>

      <div className="view-body">
        <FeedList />
      </div>
    </div>
  );
}
