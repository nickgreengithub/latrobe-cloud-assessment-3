import { formatNumber } from "@/lib/format";

/**
 * A labelled horizontal bar, used for every "x per y" breakdown on the
 * dashboard.
 *
 * Deliberately CSS rather than a charting library. The comparisons here are
 * one-dimensional — this feed against that feed — and a bar whose width is a
 * percentage communicates that completely. Pulling in a chart library would
 * add a bundle, a canvas the screen reader cannot read, and a dependency to
 * justify, for no gain.
 */
export function MetricBar({
  label,
  value,
  max,
  detail,
  tone = "accent",
}: {
  label: string;
  value: number;
  max: number;
  detail?: string;
  tone?: "accent" | "danger";
}) {
  // A zero maximum means every bar is empty rather than every bar being full.
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="metric-row">
      <div className="metric-row-head">
        <span className="metric-row-label">{label}</span>
        <span className="metric-row-value">
          {formatNumber(value)}
          {detail ? <span className="metric-row-detail"> {detail}</span> : null}
        </span>
      </div>
      {/*
        The bar is decorative: the number beside the label already states the
        value, so announcing a second copy of it would just be noise.
      */}
      <div className="metric-track" aria-hidden="true">
        <div
          className={`metric-fill${tone === "danger" ? " danger" : ""}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
