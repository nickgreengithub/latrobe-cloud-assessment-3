"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PulsePoint } from "@/lib/api";
import { formatClock } from "@/lib/format";

/**
 * Activity pulse — requests and errors over the reporting window.
 *
 * A line chart, because the job is trend over time. Two series only: total
 * requests, and the errors among them. Errors are drawn in the reserved
 * status colour rather than a third categorical hue, because "this is the bad
 * one" is the whole point of plotting it.
 *
 * The two colours were checked with the palette validator against both theme
 * surfaces rather than chosen by eye: CVD separation ΔE 23.5 in dark and 29.8
 * in light, both comfortably past the ≥8 target, and both inside the
 * lightness band for their surface.
 *
 * Drawn in real pixel coordinates from a ResizeObserver rather than in a
 * scaled viewBox. A viewBox stretched to fill a flexible panel turns the end
 * markers into ellipses and the strokes into different weights on each axis.
 */

type Size = { width: number; height: number };

const PADDING = { top: 14, right: 16, bottom: 20, left: 34 };
const MIN_HEIGHT = 120;

function niceCeiling(value: number) {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export function PulseChart({
  points,
  bucketSeconds,
  live = true,
}: {
  points: PulsePoint[];
  bucketSeconds: number;
  /** Drives the leading-edge ping — a heartbeat on a paused view would lie. */
  live?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [hover, setHover] = useState<number | null>(null);

  // Measuring in a callback, not in an effect body — the observer is the
  // external system this component is subscribing to.
  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setSize({ width: box.width, height: box.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const width = size.width;
  const height = Math.max(MIN_HEIGHT, size.height);
  const plotWidth = Math.max(1, width - PADDING.left - PADDING.right);
  const plotHeight = Math.max(1, height - PADDING.top - PADDING.bottom);

  const peak = Math.max(1, ...points.map((p) => p.requests));
  const yMax = niceCeiling(peak);

  const xAt = useCallback(
    (index: number) =>
      PADDING.left +
      (points.length > 1 ? (index / (points.length - 1)) * plotWidth : plotWidth / 2),
    [plotWidth, points.length],
  );
  const yAt = useCallback(
    (value: number) => PADDING.top + plotHeight - (value / yMax) * plotHeight,
    [plotHeight, yMax],
  );

  function pathFor(key: "requests" | "errors") {
    return points
      .map((point, index) => `${index ? "L" : "M"}${xAt(index)},${yAt(point[key])}`)
      .join(" ");
  }

  const areaPath =
    points.length > 1
      ? `${pathFor("requests")} L${xAt(points.length - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`
      : "";

  const lastIndex = points.length - 1;
  const latest = points[lastIndex];
  const active = hover === null ? null : points[hover];
  const totalRequests = points.reduce((sum, p) => sum + p.requests, 0);
  const totalErrors = points.reduce((sum, p) => sum + p.errors, 0);

  /** Snap to the nearest bucket — readers aim at a time, not at a 2px line. */
  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - PADDING.left;
    const ratio = Math.max(0, Math.min(1, x / plotWidth));
    setHover(Math.round(ratio * (points.length - 1)));
  }

  const bucketLabel =
    bucketSeconds >= 60
      ? `${Math.round(bucketSeconds / 60)} min`
      : `${bucketSeconds}s`;

  return (
    <div className="pulse">
      <div className="pulse-head">
        <div className="pulse-legend">
          {/* Two series, so a legend is mandatory — identity is never colour
              alone. Line keys mirror the mark. */}
          <span className="legend-item">
            <svg className="legend-key" viewBox="0 0 16 8" aria-hidden="true">
              <line x1="1" y1="4" x2="15" y2="4" className="key-requests" />
            </svg>
            Requests
            <strong>{totalRequests.toLocaleString()}</strong>
          </span>
          <span className="legend-item">
            <svg className="legend-key" viewBox="0 0 16 8" aria-hidden="true">
              <line x1="1" y1="4" x2="15" y2="4" className="key-errors" />
            </svg>
            Errors
            <strong>{totalErrors.toLocaleString()}</strong>
          </span>
        </div>
        <span className="pulse-bucket">{bucketLabel} buckets</span>
      </div>

      <div className="pulse-plot" ref={wrapRef}>
        {width > 0 ? (
          <svg
            className="pulse-svg"
            width={width}
            height={height}
            role="img"
            aria-label={`Requests and errors over the reporting window, in ${bucketLabel} buckets. ${totalRequests} requests and ${totalErrors} errors in total.`}
            onPointerMove={handleMove}
            onPointerLeave={() => setHover(null)}
          >
            {/* Gridlines: hairline, solid, recessive. */}
            {[0, 0.5, 1].map((fraction) => (
              <g key={fraction}>
                <line
                  className="pulse-grid"
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={yAt(yMax * fraction)}
                  y2={yAt(yMax * fraction)}
                />
                <text
                  className="pulse-axis"
                  x={PADDING.left - 6}
                  y={yAt(yMax * fraction) + 3}
                  textAnchor="end"
                >
                  {Math.round(yMax * fraction)}
                </text>
              </g>
            ))}

            <path className="pulse-area" d={areaPath} />
            <path className="pulse-line requests" d={pathFor("requests")} />
            <path className="pulse-line errors" d={pathFor("errors")} />

            {/* The leading edge — "now".
                The expanding ring is the pulse: it repeats on a fixed beat
                whether or not traffic is arriving, because its job is to say
                the view is still counting, not to encode a value. It is
                drawn beneath the marker and carries no data, so it is hidden
                from assistive technology and stopped under reduced motion.
                Only the endpoint is marked — a marker on every point is
                chaos and goes unread. */}
            {latest ? (
              <g>
                {live ? (
                  <circle
                    className="pulse-ping"
                    cx={xAt(lastIndex)}
                    cy={yAt(latest.requests)}
                    r={4}
                    aria-hidden="true"
                  />
                ) : null}
                <circle
                  className={`pulse-marker${live ? " beating" : ""}`}
                  cx={xAt(lastIndex)}
                  cy={yAt(latest.requests)}
                  r={4}
                />
              </g>
            ) : null}

            {hover !== null && active ? (
              <g>
                <line
                  className="pulse-crosshair"
                  x1={xAt(hover)}
                  x2={xAt(hover)}
                  y1={PADDING.top}
                  y2={PADDING.top + plotHeight}
                />
                <circle
                  className="pulse-marker"
                  cx={xAt(hover)}
                  cy={yAt(active.requests)}
                  r={4}
                />
                {active.errors > 0 ? (
                  <circle
                    className="pulse-marker errors"
                    cx={xAt(hover)}
                    cy={yAt(active.errors)}
                    r={4}
                  />
                ) : null}
              </g>
            ) : null}

            <text
              className="pulse-axis"
              x={PADDING.left}
              y={height - 6}
              textAnchor="start"
            >
              {points.length ? formatClock(points[0].at) : ""}
            </text>
            <text
              className="pulse-axis"
              x={width - PADDING.right}
              y={height - 6}
              textAnchor="end"
            >
              now
            </text>
          </svg>
        ) : null}

        {/* One tooltip listing every series, so the pointer never has to land
            on a line to get a value. Values lead, labels follow. */}
        {hover !== null && active ? (
          <div
            className="pulse-tooltip"
            style={{
              left: `${Math.min(Math.max(xAt(hover), 70), Math.max(70, width - 70))}px`,
            }}
            role="status"
          >
            <span className="tooltip-time">{formatClock(active.at)}</span>
            <span className="tooltip-row">
              <strong>{active.requests}</strong> requests
            </span>
            <span className="tooltip-row">
              <strong>{active.polls}</strong> feed polls
            </span>
            <span className={`tooltip-row${active.errors ? " bad" : ""}`}>
              <strong>{active.errors}</strong> errors
            </span>
          </div>
        ) : null}
      </div>

      {/*
        The table view. Every value the tooltip shows is reachable without a
        pointer — the tooltip enhances, it never gates. Kept out of the visual
        layout because the chart is the visual answer; this is the same data
        for a screen reader or a keyboard user.
      */}
      <table className="sr-only">
        <caption>Requests, feed polls and errors per {bucketLabel} bucket</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Requests</th>
            <th scope="col">Feed polls</th>
            <th scope="col">Errors</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.at}>
              <th scope="row">{formatClock(point.at)}</th>
              <td>{point.requests}</td>
              <td>{point.polls}</td>
              <td>{point.errors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
