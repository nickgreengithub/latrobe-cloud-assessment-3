"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarIcon, RssIcon, SearchIcon, UserIcon } from "@/components/icons";
import { Collapsible } from "@/components/Collapsible";
import { listChannels } from "@/lib/api";
import { formatFeedDate, type Channel } from "@/lib/types";

/**
 * The RSS Client.
 *
 * This is a genuine feed reader, not an internal shortcut: it makes an HTTP
 * request to the server's /rss endpoint, receives XML over the wire, and parses
 * it with DOMParser exactly as any third-party client would. The raw response
 * and the transport details are shown alongside the rendered items so it is
 * visible that real RSS crossed the network.
 */

type ParsedItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  creator: string;
  categories: string[];
};

type ParsedFeed = {
  title: string;
  description: string;
  items: ParsedItem[];
};

type Transport = {
  status: number;
  contentType: string;
  durationMs: number;
  bytes: number;
};

function text(parent: Element, tag: string) {
  return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
}

function parseFeed(xml: string): ParsedFeed {
  const doc = new DOMParser().parseFromString(xml, "application/xml");

  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) throw new Error("The server returned XML this client could not parse.");

  const channel = doc.getElementsByTagName("channel")[0];
  if (!channel) throw new Error("No <channel> element — this is not an RSS 2.0 feed.");

  const items = Array.from(doc.getElementsByTagName("item")).map((item) => ({
    title: text(item, "title"),
    link: text(item, "link"),
    description: text(item, "description"),
    pubDate: text(item, "pubDate"),
    creator: text(item, "dc:creator") || text(item, "creator"),
    categories: Array.from(item.getElementsByTagName("category")).map(
      (c) => c.textContent?.trim() ?? "",
    ),
  }));

  return {
    title: text(channel, "title"),
    description: text(channel, "description"),
    items,
  };
}

export function RssClient() {
  const [endpoint, setEndpoint] = useState("/rss");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [feed, setFeed] = useState<ParsedFeed | null>(null);
  const [raw, setRaw] = useState("");
  const [transport, setTransport] = useState<Transport | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async (url: string) => {
    setState("loading");
    setError(null);
    const started = performance.now();

    try {
      const response = await fetch(url, { cache: "no-store" });
      const body = await response.text();
      const durationMs = Math.round(performance.now() - started);

      setTransport({
        status: response.status,
        contentType: response.headers.get("content-type") ?? "unknown",
        durationMs,
        bytes: new Blob([body]).size,
      });

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? `No such channel — the server returned 404 for ${url}`
            : `The server returned ${response.status}.`,
        );
      }

      setRaw(body);
      setFeed(parseFeed(body));
      setState("ready");
    } catch (err) {
      setFeed(null);
      setRaw("");
      setError(
        err instanceof TypeError
          ? "Cannot reach the RSS server. Is it running?"
          : err instanceof Error
            ? err.message
            : "Could not fetch the feed.",
      );
      setState("error");
    }
  }, []);

  // Load the channel buttons, then subscribe to the aggregate feed on arrival.
  // Deferred so the first setState does not run synchronously in the effect body.
  useEffect(() => {
    const timer = setTimeout(() => {
      listChannels()
        .then(setChannels)
        .catch(() => setChannels([]));
      void fetchFeed("/rss");
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchFeed]);

  function selectEndpoint(url: string) {
    setEndpoint(url);
    void fetchFeed(url);
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <span className="panel-head-title">
            <RssIcon />
            Subscribe to a feed
          </span>
          {transport ? (
            <span>
              {transport.status} · {transport.durationMs}ms · {transport.bytes}B
            </span>
          ) : null}
        </div>

        <div className="panel-body tight" style={{ flex: "none" }}>
          <form
            className="btn-row"
            onSubmit={(event) => {
              event.preventDefault();
              void fetchFeed(endpoint);
            }}
          >
            <label className="search-field" style={{ flex: 1 }}>
              <SearchIcon />
              <input
                type="text"
                value={endpoint}
                aria-label="Feed endpoint URL"
                onChange={(event) => setEndpoint(event.target.value)}
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={state === "loading"}>
              {state === "loading" ? "Fetching…" : "Fetch feed"}
            </button>
          </form>

          <div className="btn-row" style={{ marginTop: "0.6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-ghost${endpoint === "/rss" ? " is-active" : ""}`}
              onClick={() => selectEndpoint("/rss")}
            >
              /rss — everything
            </button>
            {channels.map((channel) => (
              <button
                key={channel.slug}
                type="button"
                className={`btn btn-ghost${
                  endpoint === `/rss/${channel.slug}` ? " is-active" : ""
                }`}
                onClick={() => selectEndpoint(`/rss/${channel.slug}`)}
              >
                /rss/{channel.slug}
              </button>
            ))}
          </div>

          <p className="inline-note" style={{ marginTop: "0.6rem" }}>
            Subscribing to a category means pointing this client at a different
            endpoint — nothing else changes.
          </p>
        </div>
      </section>

      {state === "error" ? (
        <section className="panel">
          <div className="panel-body">
            <p className="empty-state" style={{ color: "var(--danger)" }} role="alert">
              {error}
            </p>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void fetchFeed(endpoint)}
              >
                Retry
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {feed ? (
        <section className="panel">
          <div className="panel-head">
            <span className="panel-head-title">
              <RssIcon />
              {feed.title}
            </span>
            <span>
              {feed.items.length} item{feed.items.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="panel-body tight" style={{ flex: "none" }}>
            <p className="inline-note">{feed.description}</p>
          </div>

          <div className="scroll-area">
            {feed.items.length === 0 ? (
              <p className="empty-state">This channel has no published items yet.</p>
            ) : (
              <div className="feed-list">
                {feed.items.map((item) => (
                  <article key={item.link || item.title} className="feed-row static">
                    <span className="feed-row-body">
                      {item.categories.length ? (
                        <span className="feed-cat">{item.categories.join(" · ")}</span>
                      ) : null}
                      <span className="feed-meta">
                        <span>
                          <CalendarIcon />
                          {item.pubDate ? formatFeedDate(item.pubDate) : "No date"}
                        </span>
                        {item.creator ? (
                          <span>
                            <UserIcon />
                            {item.creator}
                          </span>
                        ) : null}
                      </span>
                      <span className="feed-title">{item.title}</span>
                      <span className="feed-summary">{item.description}</span>
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {raw ? (
        <Collapsible title="Raw RSS 2.0 response">
          <pre className="code-block" aria-label="Raw XML received from the server">
            {raw}
          </pre>
        </Collapsible>
      ) : null}
    </div>
  );
}
