/**
 * Image slot for a feed item.
 *
 * Renders nothing when a post has no image. Assessment 1 filled the gap with a
 * generated gradient so the sample content had visual weight, but the posts now
 * come from the database and most genuinely have no media — a decorative block
 * standing in for a picture that does not exist is noise, and it costs the row
 * horizontal space that the title and summary can use instead.
 */
export function FeedThumb({
  imageUrl,
  className,
}: {
  imageUrl?: string;
  className?: string;
}) {
  if (!imageUrl) return null;

  return (
    <span className={className ? `feed-thumb ${className}` : "feed-thumb"}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="feed-thumb-img" src={imageUrl} alt="" loading="lazy" />
    </span>
  );
}
