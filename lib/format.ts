/**
 * Shared time formatting for the dashboard.
 *
 * `Date.prototype.toLocaleTimeString` builds a fresh Intl formatter on every
 * call. The dashboard renders about a hundred timestamps — 48 chart buckets,
 * the activity list, the feed table — and re-renders every ten seconds, so
 * calling it inline meant constructing a hundred formatters twice a minute.
 * Constructing each formatter once and reusing it costs nothing and removes
 * that work from the main thread entirely.
 */

const CLOCK = new Intl.DateTimeFormat("en-AU", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const SHORT_CLOCK = new Intl.DateTimeFormat("en-AU", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Hours, minutes and seconds — for anything a reader watches change. */
export function formatTime(iso: string | null) {
  if (!iso) return "never";
  return CLOCK.format(new Date(iso));
}

/** Hours and minutes — for axis ticks, where seconds are noise. */
export function formatClock(iso: string) {
  return SHORT_CLOCK.format(new Date(iso));
}
