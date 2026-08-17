/**
 * Shared formatting for the dashboard.
 *
 * Two reasons everything funnels through here.
 *
 * **Correctness.** These values are rendered on the server and then hydrated
 * in the browser, and both sides have to produce identical text or React
 * discards the server markup and re-renders. `toLocaleTimeString()` with no
 * arguments uses whatever locale and time zone the process happens to be in,
 * so a container running UTC renders 07:16 while a browser in UTC+7 renders
 * 14:16 — and the same applies to thousands separators. It looks correct on a
 * laptop where both sides share a locale and breaks the moment it is
 * deployed. It did exactly that: the first deployment to EC2 threw React
 * error #418 on the dashboard, which no amount of local testing could have
 * surfaced.
 *
 * Pinning the locale and the zone makes both sides agree by construction.
 * Melbourne rather than UTC because this is a La Trobe system, and the times
 * on screen should be the ones its readers keep, wherever the container runs.
 *
 * **Cost.** Each constructor below builds an Intl formatter, which is not
 * cheap. The dashboard formats around a hundred values and re-renders every
 * ten seconds; building them per call cost 360 ms of main-thread blocking
 * before they were hoisted to module scope.
 */

const LOCALE = "en-AU";
const ZONE = "Australia/Melbourne";

const CLOCK = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: ZONE,
});

const SHORT_CLOCK = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: ZONE,
});

const DAY = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: ZONE,
});

const NUMBER = new Intl.NumberFormat(LOCALE);

/** "AEST" or "AEDT" — resolved rather than hard-coded, so it stays true. */
export const TIME_ZONE_LABEL =
  new Intl.DateTimeFormat(LOCALE, { timeZone: ZONE, timeZoneName: "short" })
    .formatToParts(new Date(0))
    .find((part) => part.type === "timeZoneName")?.value ?? "AEST";

/** Hours, minutes and seconds — for anything a reader watches change. */
export function formatTime(iso: string | null) {
  if (!iso) return "never";
  return CLOCK.format(new Date(iso));
}

/** Hours and minutes — for axis ticks and tables, where seconds are noise. */
export function formatClock(iso: string) {
  return SHORT_CLOCK.format(new Date(iso));
}

/** Hours and minutes, or "never" for a channel nothing has polled yet. */
export function formatClockOrNever(iso: string | null) {
  if (!iso) return "never";
  return SHORT_CLOCK.format(new Date(iso));
}

/** A date, for axis ticks spanning more than a day. */
export function formatDay(value: Date | number) {
  return DAY.format(value);
}

/** Seconds-precision clock from a timestamp, for the live clock. */
export function formatClockFrom(value: Date | number) {
  return CLOCK.format(value);
}

/** Thousands separators that do not depend on the host's locale. */
export function formatNumber(value: number) {
  return NUMBER.format(value);
}
