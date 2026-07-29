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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { compact } = useTheme();

  useEffect(() => {
    setFeeds(loadFeeds());
    setReady(true);
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(feeds.map((feed) => feed.category))).sort();
  }, [feeds]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return feeds.filter((feed) => {
      const matchesCategory =
        categoryFilter === "all" || feed.category === categoryFilter;
      const matchesTerm =
        !term ||
        `${feed.title} ${feed.summary} ${feed.author} ${feed.category}`
          .toLowerCase()
          .includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [feeds, query, categoryFilter]);

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

  // ---- Article view: the selected post replaces the list in place ----
  if (selected) {
    return (
      <section className="panel">
        <div className="panel-head panel-head-article">
          <button
            type="button"
            className="panel-back"
            onClick={closeArticle}
            aria-label="Back to posts"
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
                Back to posts
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
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
        <span>{ready ? `${visible.length} of ${feeds.length}` : "Loading"}</span>
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
            value={categoryFilter}
            aria-label="Filter by category"
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
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
        {!ready ? (
          <p className="empty-state">Loading posts…</p>
        ) : visible.length === 0 ? (
          <p className="empty-state">
            {feeds.length === 0
              ? "No posts yet — create one to preview the RSS workflow."
              : "No posts match your search or category filter."}
          </p>
        ) : (
          <div className="feed-list">
            {visible.map((feed) => (
              <button
                key={feed.id}
                type="button"
                className={`feed-row${compact ? " compact" : ""}`}
                aria-label={`${feed.title} — ${feed.category}`}
                onClick={() => setSelectedId(feed.id)}
              >
                <FeedThumb imageUrl={feed.imageUrl} seed={feed.id} />
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

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title="New post"
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
