"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { addFeed } from "@/lib/feeds";

export function FeedForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "");
    const summary = String(data.get("summary") ?? "");
    const content = String(data.get("content") ?? "");
    const author = String(data.get("author") ?? "");
    const imageUrl = String(data.get("imageUrl") ?? "");
    const source = String(data.get("source") ?? "");

    if (!title.trim() || !summary.trim() || !content.trim()) {
      setError("Title, summary, and content are required.");
      return;
    }

    const item = addFeed({ title, summary, content, author, imageUrl, source });
    router.push(`/feeds/${item.id}`);
  }

  return (
    <form className="panel stack" style={{ padding: "1.1rem" }} onSubmit={onSubmit}>
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
          <label htmlFor="source">Source label</label>
          <input id="source" name="source" placeholder="CSE2CWA / Local draft" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="imageUrl">Image URL (optional)</label>
        <input id="imageUrl" name="imageUrl" placeholder="https://…" />
      </div>
      {error ? (
        <p className="inline-note" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}
      <div className="btn-row">
        <button className="btn" type="submit">
          Publish locally
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => router.push("/feeds")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
