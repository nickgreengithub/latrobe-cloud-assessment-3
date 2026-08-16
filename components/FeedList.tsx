"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  PlusIcon,
  RssIcon,
  SearchIcon,
  TrashIcon,
  UserIcon,
} from "@/components/icons";
import { Dialog } from "@/components/Dialog";
import { FeedForm } from "@/components/FeedForm";
import { FeedThumb } from "@/components/FeedThumb";
import { ApiError, deletePost, listChannels, listPosts } from "@/lib/api";
import { formatFeedDate, toFeedItem, type Channel, type FeedItem } from "@/lib/types";

/**
 * The post browser, now backed by the API rather than local storage.
 *
 * Filtering by channel and searching are pushed down to the server as query
 * parameters, so the list reflects the database rather than a filtered copy of
 * whatever happened to be loaded — which is also what makes paging honest.
 */
export function FeedList() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { compact } = useTheme();

  const refresh = useCallback(async () => {
    try {
      const [posts, chans] = await Promise.all([
        listPosts({ feed: channelFilter, q: query.trim() || undefined, limit: 100 }),
        listChannels(),
      ]);
      setFeeds(posts.data.map(toFeedItem));
      setTotal(posts.meta?.total ?? posts.data.length);
      setChannels(chans);
      setStatus("ready");
      setError(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }, [channelFilter, query]);

  useEffect(() => {
    // Debounced so typing in the search box does not fire a request per keystroke.
    const timer = setTimeout(refresh, 200);
    return () => clearTimeout(timer);
  }, [refresh]);

  const selected = useMemo(
    () => feeds.find((feed) => feed.id === selectedId) ?? null,
    [feeds, selectedId],
  );

  async function handleDelete() {
    if (!selected) return;
    try {
      await deletePost(selected.id);
      setSelectedId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the post.");
    }
  }

  // ---- Article view: the selected post replaces the list in place ----
  if (selected) {
    return (
      <section className="panel">
        <div className="panel-head panel-head-article">
          <button
            type="button"
            className="panel-back"
            onClick={() => setSelectedId(null)}
            aria-label="Back to posts"
          >
            <ArrowLeftIcon />
          </button>
          <span className="article-name">{selected.title}</span>
        </div>

        <div className="scroll-area">
          <div className="article-view">
            <FeedThumb imageUrl={selected.imageUrl} className="feed-hero" />

            <span className="feed-cat">{selected.category}</span>

            <div className="feed-meta">
              <span>
                <CalendarIcon />
                {formatFeedDate(selected.pubDate)}
              </span>
              <span>
                <UserIcon />
                {selected.author}
              </span>
              <span>
                <RssIcon />
                {selected.source ?? "Unfiled"}
              </span>
            </div>

            <p className="feed-detail-lead">{selected.summary}</p>

            <div className="prose">
              {selected.content.split("\n\n").map((paragraph) => (
                <p key={paragraph.slice(0, 24)}>{paragraph}</p>
              ))}
            </div>

            <div className="btn-row">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSelectedId(null)}
              >
                <ArrowLeftIcon />
                Back to posts
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                <TrashIcon />
                Delete post
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ---- List view ----
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-head-title">
          <RssIcon />
          Posts
        </span>
        <span>
          {status === "loading"
            ? "Loading"
            : status === "error"
              ? "Unavailable"
              : `${feeds.length} of ${total}`}
        </span>
      </div>

      <div className="panel-body tight" style={{ flex: "none" }}>
        <div className="btn-row">
          <label className="search-field">
            <SearchIcon />
            <input
              type="search"
              value={query}
              placeholder="Search posts…"
              aria-label="Search posts"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            className="filter-select"
            value={channelFilter}
            aria-label="Filter by channel"
            onChange={(event) => setChannelFilter(event.target.value)}
          >
            <option value="all">All channels</option>
            {channels.map((channel) => (
              <option key={channel.slug} value={channel.slug}>
                {channel.title} ({channel.postCount ?? 0})
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <PlusIcon />
            New
          </button>
        </div>
      </div>

      <div className="scroll-area">
        {status === "loading" ? (
          <p className="empty-state">Loading posts from the server…</p>
        ) : status === "error" ? (
          <div className="empty-state">
            <p style={{ color: "var(--danger)" }}>{error}</p>
            <button type="button" className="btn btn-ghost" onClick={refresh}>
              Try again
            </button>
          </div>
        ) : feeds.length === 0 ? (
          <p className="empty-state">
            {query || channelFilter !== "all"
              ? "No posts match your search or channel filter."
              : "No posts yet — create one to publish it to the RSS feed."}
          </p>
        ) : (
          <div className="feed-list">
            {feeds.map((feed) => (
              <button
                key={feed.id}
                type="button"
                className={`feed-row${compact ? " compact" : ""}${
                  feed.imageUrl ? "" : " no-thumb"
                }`}
                /*
                  No aria-label. One used to read "<title> — <category>",
                  which is a subset of the text visible inside the button —
                  the date, author and summary were not in it. Lighthouse
                  flags that as a label/name mismatch, and it means a voice
                  user reading the row aloud cannot reliably select it. The
                  row's own content is the accessible name instead: longer to
                  hear, but it always matches what is on screen.
                */
                onClick={() => setSelectedId(feed.id)}
              >
                <FeedThumb imageUrl={feed.imageUrl} />
                <span className="feed-row-body">
                  <span className="feed-cat">{feed.category}</span>
                  <span className="feed-meta">
                    <span>
                      <CalendarIcon />
                      {formatFeedDate(feed.pubDate)}
                    </span>
                    <span>
                      <UserIcon />
                      {feed.author}
                    </span>
                  </span>
                  <span className="feed-title">
                    {feed.title}
                    <ArrowRightIcon />
                  </span>
                  <span className="feed-summary">{feed.summary}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title="New post">
        <FeedForm
          embedded
          channels={channels}
          onCancel={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            void refresh();
          }}
        />
      </Dialog>
    </section>
  );
}
