"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FeedThumb } from "@/components/FeedThumb";
import {
  ArrowLeftIcon,
  CalendarIcon,
  RssIcon,
  TrashIcon,
  UserIcon,
} from "@/components/icons";
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
      <nav className="detail-crumbs" aria-label="Breadcrumb">
        <Link href="/feeds">Feeds</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Item</span>
      </nav>

      <FeedThumb imageUrl={feed.imageUrl} seed={feed.id} className="feed-hero" />

      <header className="feed-detail-head">
        <div className="feed-meta">
          <span>
            <CalendarIcon />
            {formatFeedDate(feed.pubDate)}
          </span>
          <span>
            <UserIcon />
            {feed.author}
          </span>
          <span>
            <RssIcon />
            {feed.source ?? "Local"}
          </span>
        </div>
        <h1 className="feed-detail-title">{feed.title}</h1>
        <p className="feed-detail-lead">{feed.summary}</p>
      </header>

      <div className="panel">
        <div className="panel-body">
          <div className="prose">
            {feed.content.split("\n\n").map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="btn-row">
        <Link className="btn btn-ghost" href="/feeds">
          <ArrowLeftIcon />
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
          <TrashIcon />
          Delete local item
        </button>
      </div>
    </article>
  );
}
