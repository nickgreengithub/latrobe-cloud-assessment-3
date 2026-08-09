import { FeedForm } from "@/components/FeedForm";
import { PlusIcon } from "@/components/icons";
import { prisma } from "@/lib/db";

/**
 * Server component: the channel list is read from the database here and handed
 * to the form, so the options are always the channels the server actually
 * publishes rather than a hardcoded list.
 */
export default async function NewFeedPage() {
  const channels = await prisma.feed.findMany({ orderBy: { title: "asc" } });

  return (
    <div className="view">
      <header className="view-head">
        <p className="view-kicker">
          <PlusIcon />
          Feeds / Create
        </p>
        <h1 className="sr-only">New post</h1>
        <p className="view-lead">
          Posts are saved to the server database and published to the RSS channels
          you select.
        </p>
      </header>

      <div className="view-body scroll-area detail-scroll">
        <FeedForm channels={channels} />
      </div>
    </div>
  );
}
