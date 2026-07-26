"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  deleteFeed,
  formatFeedDate,
  loadFeeds,
  type FeedItem,
} from "@/lib/feeds";

export function FeedList() {
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { compact } = useTheme();

  useEffect(() => {
    setFeeds(loadFeeds());
    setReady(true);
  }, []);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return feeds;
    return feeds.filter((feed) =>
      `${feed.title} ${feed.summary} ${feed.author}`.toLowerCase().includes(term),
    );
  }, [feeds, query]);

  const selected = useMemo(
    () => feeds.find((feed) => feed.id === selectedId) ?? null,
    [feeds, selectedId],
  );

  function closeArticle() {
    setSelectedId(null);
  }

  function handleDelete() {
    if (!selected) return;
    deleteFeed(selected.id);
    setFeeds(loadFeeds());
    setSelectedId(null);
  }

  // ---- Article view: the selected item replaces the list in place ----
  if (selected) {
    return (
      <section className="panel">
        <div className="panel-head panel-head-article">
          <button
            type="button"
            className="panel-back"
            onClick={closeArticle}
            aria-label="Back to feed items"
          >
            <ArrowLeftIcon />
          </button>
          <span className="article-name">{selected.title}</span>
        </div>

        <div className="scroll-area">
          <div className="article-view">
            <FeedThumb
              imageUrl={selected.imageUrl}
              seed={selected.id}
              className="feed-hero"
            />

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
                {selected.source ?? "Local"}
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
                onClick={closeArticle}
              >
                <ArrowLeftIcon />
                Back to feed items
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                <TrashIcon />
                Delete local item
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
          Feed items
        </span>
        <span>{ready ? `${visible.length} of ${feeds.length}` : "Loading"}</span>
      </div>

      <div className="panel-body tight" style={{ flex: "none" }}>
        <div className="btn-row" style={{ flexWrap: "nowrap" }}>
          <label className="search-field">
            <SearchIcon />
            <input
              type="search"
              value={query}
              placeholder="Search feed items…"
              aria-label="Search feed items"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
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
        {!ready ? (
          <p className="empty-state">Loading local feed items…</p>
        ) : visible.length === 0 ? (
          <p className="empty-state">
            {feeds.length === 0
              ? "No feed items yet — create a local draft to preview the RSS workflow."
              : "No items match that search."}
          </p>
        ) : (
          <div className="feed-list">
            {visible.map((feed) => (
              <button
                key={feed.id}
                type="button"
                className={`feed-row${compact ? " compact" : ""}`}
                aria-label={feed.title}
                onClick={() => setSelectedId(feed.id)}
              >
                <FeedThumb imageUrl={feed.imageUrl} seed={feed.id} />
                <span className="feed-row-body">
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

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New feed item"
      >
        <FeedForm
          embedded
          onCancel={() => setShowForm(false)}
          onSuccess={() => {
            setFeeds(loadFeeds());
            setShowForm(false);
          }}
        />
      </Dialog>
    </section>
  );
}
