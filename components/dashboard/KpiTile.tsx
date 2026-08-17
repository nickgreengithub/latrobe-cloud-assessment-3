"use client";

/**
 * A single headline figure.
 *
 * A stat tile rather than a one-bar chart: a current value has no comparison
 * to make, so a chart would be ink without information.
 *
 * Every tile is a button. Clicking one opens the section that explains it —
 * "unique clients" goes to the client breakdown, "feed polls" to the feed
 * breakdown — so the numbers themselves are the navigation, and a reader who
 * wants the detail behind a figure clicks the figure rather than hunting for
 * the right tab.
 */
export function KpiTile({
  label,
  value,
  detail,
  tone = "neutral",
  onOpen,
  opensLabel,
}: {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "neutral" | "ok" | "warn" | "bad";
  onOpen?: () => void;
  opensLabel?: string;
}) {
  const body = (
    <>
      <span className="kpi-value">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="kpi-label">{label}</span>
      {detail ? <span className="kpi-detail">{detail}</span> : null}
    </>
  );

  if (!onOpen) {
    return <div className={`kpi-tile tone-${tone}`}>{body}</div>;
  }

  return (
    <button type="button" className={`kpi-tile tone-${tone} is-link`} onClick={onOpen}>
      {body}
      {/*
        Visually hidden text inside the button, not an aria-label on it.
        An aria-label replaces the accessible name outright, and this tile's
        visible text is a value, a label and a detail line — any label short
        enough to write is a subset of that, which is the label/name mismatch
        this project already fixed once in the header and the post list.
        Hidden text is additive: it joins the visible content instead of
        replacing it, so the name stays a superset of what is on screen.
      */}
      {opensLabel ? <span className="sr-only">{opensLabel}</span> : null}
    </button>
  );
}
