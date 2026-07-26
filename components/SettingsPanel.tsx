"use client";

import { useTheme } from "@/components/ThemeProvider";
import { resetFeeds } from "@/lib/feeds";
import { useState } from "react";

export function SettingsPanel() {
  const { theme, setTheme, compact, setCompact, ready } = useTheme();
  const [resetNote, setResetNote] = useState<string | null>(null);

  if (!ready) {
    return <p className="inline-note">Loading preferences…</p>;
  }

  return (
    <div className="panel" style={{ padding: "0.25rem 1.1rem 1.1rem" }}>
      <div className="toggle-row">
        <div className="toggle-copy">
          <strong>Colour theme</strong>
          <span>
            Light and dark modes use the same Alliance / cyan line system. Preference
            is saved in a cookie.
          </span>
        </div>
        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={theme === "dark"}
          aria-label="Dark mode"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        />
      </div>

      <div className="toggle-row">
        <div className="toggle-copy">
          <strong>Compact feed list</strong>
          <span>
            Hide summaries on the Feeds page for faster scanning. Stored in local
            storage.
          </span>
        </div>
        <button
          type="button"
          className="switch"
          role="switch"
          aria-checked={compact}
          aria-label="Compact feed list"
          onClick={() => setCompact(!compact)}
        />
      </div>

      <div className="toggle-row">
        <div className="toggle-copy">
          <strong>Reset sample feeds</strong>
          <span>Restore the Module 4-style seed announcements in local storage.</span>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            resetFeeds();
            setResetNote("Sample feeds restored.");
          }}
        >
          Reset
        </button>
      </div>

      <p className="inline-note" style={{ marginTop: "1rem" }}>
        Active theme: {theme} · Compact list: {compact ? "on" : "off"}
        {resetNote ? ` · ${resetNote}` : ""}
      </p>
    </div>
  );
}
