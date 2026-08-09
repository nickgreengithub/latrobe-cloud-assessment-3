import { RssClient } from "@/components/RssClient";
import { RssIcon } from "@/components/icons";

export const metadata = {
  title: "RSS Client — La Trobe RSS Server",
  description:
    "A feed reader that subscribes to this server's RSS channels over HTTP.",
};

/**
 * The client half of the RSS Server / RSS Client pair. It fetches XML from the
 * server's /rss endpoints exactly as an external subscriber would.
 */
export default function ClientPage() {
  return (
    <div className="view">
      <header className="view-head">
        <p className="view-kicker">
          <RssIcon />
          RSS Client
        </p>
        <h1 className="sr-only">RSS Client</h1>
        <p className="view-lead">
          This page is a subscriber, not part of the server UI. It requests XML over
          HTTP from the RSS Server and renders whatever the feed contains.
        </p>
      </header>

      <div className="view-body scroll-area detail-scroll">
        <RssClient />
      </div>
    </div>
  );
}
