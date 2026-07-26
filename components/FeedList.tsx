"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  formatFeedDate,
  loadFeeds,
  type FeedItem,
} from "@/lib/feeds";

export function FeedList() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [ready, setReady] = useState(false);
  const { compact } = useTheme();

  useEffect(() => {
    setFeeds(loadFeeds());
    setReady(true);
  }, []);

  if (!ready) {
    return <p className="inline-note">Loading local feeds…</p>;
  }

  if (feeds.length === 0) {
    return (
      <div className="empty-state">
        <p>No feed items yet. Create a local draft to preview the RSS workflow.</p>
        <div className="btn-row" style={{ marginTop: "0.85rem" }}>
          <Link className="btn" href="/feeds/new">
            Create feed item
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-list">
      {feeds.map((feed) => (
        <article
          key={feed.id}
          className={`feed-row${compact ? " compact" : ""}`}
        >
          <div className="feed-meta">
            <span>{formatFeedDate(feed.pubDate)}</span>
            <span>{feed.author}</span>
            <span>{feed.source ?? "Local"}</span>
          </div>
          <h2 className="feed-title">
            <Link href={`/feeds/${feed.id}`}>{feed.title}</Link>
          </h2>
          <p className="feed-summary">{feed.summary}</p>
          <div className="btn-row">
            <Link className="btn" href={`/feeds/${feed.id}`}>
              Read more
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
