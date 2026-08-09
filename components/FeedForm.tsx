"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, createPost } from "@/lib/api";
import type { ApiPost, Channel } from "@/lib/types";

/**
 * Publishes a new post to the server.
 *
 * A post is syndicated to one or more channels, so the category control is a
 * multi-select over the channels the server actually has, fetched by the
 * parent — the options are no longer a hardcoded list.
 */
export function FeedForm({
  onSuccess,
  onCancel,
  embedded = false,
  channels,
}: {
  onSuccess?: (item: ApiPost) => void;
  onCancel?: () => void;
  embedded?: boolean;
  channels: Channel[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const title = String(data.get("title") ?? "").trim();
    const summary = String(data.get("summary") ?? "").trim();
    const content = String(data.get("content") ?? "").trim();
    const authorName = String(data.get("author") ?? "").trim();
    const imageUrl = String(data.get("imageUrl") ?? "").trim();
    const feedSlugs = data.getAll("channels").map(String);

    if (!title || !summary || !content) {
      setError("Title, summary, and content are required.");
      return;
    }
    if (feedSlugs.length === 0) {
      setError("Choose at least one channel to publish to.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const post = await createPost({
        title,
        summary,
        content,
        feedSlugs,
        ...(authorName ? { authorName } : {}),
        ...(imageUrl ? { imageUrl } : {}),
      });
      if (onSuccess) onSuccess(post);
      else router.push(`/feeds/${post.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not publish the post.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (onCancel) onCancel();
    else router.push("/feeds");
  }

  return (
    <form
      className={embedded ? "stack" : "panel stack"}
      style={embedded ? undefined : { padding: "1.1rem" }}
      onSubmit={onSubmit}
    >
      <div className="field">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" placeholder="Announcement title" required />
      </div>
      <div className="field">
        <label htmlFor="summary">Summary</label>
        <input
          id="summary"
          name="summary"
          placeholder="Short scannable summary"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="content">Full content</label>
        <textarea
          id="content"
          name="content"
          placeholder="Paste the full notice body…"
          required
        />
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="author">Author</label>
          <input id="author" name="author" placeholder="Subject coordinator" />
        </div>
        <div className="field">
          <label htmlFor="channels">Channels</label>
          <select
            id="channels"
            name="channels"
            multiple
            size={Math.min(5, Math.max(3, channels.length))}
            defaultValue={channels.length ? [channels[0].slug] : []}
            aria-describedby="channels-hint"
          >
            {channels.map((channel) => (
              <option key={channel.slug} value={channel.slug}>
                {channel.title}
              </option>
            ))}
          </select>
          <span id="channels-hint" className="inline-note">
            Ctrl/Cmd-click to publish to more than one feed.
          </span>
        </div>
      </div>
      <div className="field">
        <label htmlFor="imageUrl">Image URL (optional)</label>
        <input id="imageUrl" name="imageUrl" placeholder="https://…" />
      </div>
      {error ? (
        <p className="inline-note" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <div className="btn-row">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Publishing…" : "Publish to feed"}
        </button>
        <button className="btn btn-ghost" type="button" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
