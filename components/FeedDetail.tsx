"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FeedThumb } from "@/components/FeedThumb";
import {
  ArrowLeftIcon,
  CalendarIcon,
  RssIcon,
  TrashIcon,
  UserIcon,
} from "@/components/icons";
import { ApiError, deletePost, getPost } from "@/lib/api";
import { formatFeedDate, toFeedItem, type FeedItem } from "@/lib/types";

/** Detail view for one post, fetched by id or slug from the API. */
export function FeedDetail({ id }: { id: string }) {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedItem | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      setFeed(toFeedItem(await getPost(id)));
      setState("ready");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setState("missing");
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong.");
        setState("error");
      }
    }
  }, [id]);

  useEffect(() => {
    // Deferred so the fetch's first setState does not run synchronously inside
    // the effect body, which would cascade an extra render.
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  if (state === "loading") {
    return <p className="inline-note">Loading post from the server…</p>;
  }

  if (state === "error") {
    return (
      <div className="empty-state">
        <p style={{ color: "var(--danger)" }}>{error}</p>
        <div className="btn-row" style={{ marginTop: "0.85rem" }}>
          <button type="button" className="btn btn-ghost" onClick={load}>
            Try again
          </button>
          <Link className="btn" href="/feeds">
            Back to feeds
          </Link>
        </div>
      </div>
    );
  }

  if (state === "missing" || !feed) {
    return (
      <div className="empty-state">
        <p>No post with that identifier exists on the server.</p>
        <div className="btn-row" style={{ marginTop: "0.85rem" }}>
          <Link className="btn" href="/feeds">
            Back to feeds
          </Link>
        </div>
      </div>
    );
  }

  async function handleDelete() {
    if (!feed) return;
    try {
      await deletePost(feed.id);
      router.push("/feeds");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the post.");
      setState("error");
    }
  }

  return (
    <article className="stack">
      <nav className="detail-crumbs" aria-label="Breadcrumb">
        <Link href="/feeds">Feeds</Link>
        <span aria-hidden="true">/</span>
        <span>{feed.category}</span>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{feed.title}</span>
      </nav>

      <FeedThumb imageUrl={feed.imageUrl} className="feed-hero" />

      <header className="feed-detail-head">
        <span className="feed-cat">{feed.category}</span>
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
            {feed.source ?? "Unfiled"}
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

      <p className="inline-note">
        Published to:{" "}
        {feed.channels.map((channel) => (
          <a key={channel.slug} href={`/rss/${channel.slug}`} className="crumb-link">
            /rss/{channel.slug}{" "}
          </a>
        ))}
      </p>

      <div className="btn-row">
        <Link className="btn btn-ghost" href="/feeds">
          <ArrowLeftIcon />
          Back to posts
        </Link>
        <button type="button" className="btn btn-danger" onClick={handleDelete}>
          <TrashIcon />
          Delete post
        </button>
      </div>
    </article>
  );
}
