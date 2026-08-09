/**
 * Illustration for the Feeds card on the home page.
 *
 * A campus noticeboard: the physical thing this server replaces. Every scrap of
 * paper pinned to it is an announcement someone had to walk past to read, which
 * is exactly the problem an RSS feed into the LMS solves.
 *
 * Decorative only, so it carries an empty alt and is hidden from assistive
 * technology — the card's own heading and copy already describe the link.
 */
export function FeedArt() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="feature-art-img"
      src="/noticeboard.jpg"
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={900}
      height={900}
    />
  );
}
