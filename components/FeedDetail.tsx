"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  deleteFeed,
  formatFeedDate,
  getFeedById,
  type FeedItem,
} from "@/lib/feeds";

export function FeedDetail({ id }: { id: string }) {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem | null | undefined>(undefined);

  useEffect(() => {
    setFeed(getFeedById(id) ?? null);
  }, [id]);

  if (feed === undefined) {
    return <p className="inline-note">Loading…</p>;
  }

  if (feed === null) {
    return (
      <div className="empty-state">
        <p>This feed item was not found in local storage.</p>
        <div className="btn-row" style={{ marginTop: "0.85rem" }}>
          <Link className="btn" href="/feeds">
            Back to feeds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article className="stack">
      <div className="feed-meta">
        <span>{formatFeedDate(feed.pubDate)}</span>
        <span>{feed.author}</span>
        <span>{feed.source ?? "Local"}</span>
      </div>
      <h1 className="page-title" style={{ marginBottom: 0 }}>
        {feed.title}
      </h1>
      <p className="page-lead">{feed.summary}</p>
      {feed.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={feed.imageUrl} alt="" style={{ border: "1px solid var(--line)" }} />
      ) : null}
      <div className="panel" style={{ padding: "1.1rem" }}>
        <div className="prose">
          {feed.content.split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>
      </div>
      <div className="btn-row">
        <Link className="btn btn-ghost" href="/feeds">
          Back to feeds
        </Link>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            deleteFeed(feed.id);
            router.push("/feeds");
          }}
        >
          Delete local item
        </button>
      </div>
    </article>
  );
}
