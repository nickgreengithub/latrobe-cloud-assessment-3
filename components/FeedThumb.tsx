import { ImageIcon } from "@/components/icons";

/**
 * Thumbnail / image slot for a feed item.
 * Renders the supplied image when present, otherwise a deterministic
 * gradient placeholder — so every card and detail view has visual weight
 * even before real RSS media arrives in Assessment 2.
 */

const GRADIENTS = [
  "linear-gradient(135deg, #6366f1, #22d3ee)",
  "linear-gradient(135deg, #8b5cf6, #ec4899)",
  "linear-gradient(135deg, #0ea5e9, #22d3ee)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #10b981, #06b6d4)",
  "linear-gradient(135deg, #f472b6, #8b5cf6)",
];

/** Stable index from a seed string — no Math.random so SSR/CSR agree. */
function pickGradient(seed: string) {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) {
    sum = (sum + seed.charCodeAt(i)) % 9973;
  }
  return GRADIENTS[sum % GRADIENTS.length];
}

export function FeedThumb({
  imageUrl,
  seed,
  className,
}: {
  imageUrl?: string;
  seed: string;
  className?: string;
}) {
  const cls = className ? `feed-thumb ${className}` : "feed-thumb";

  if (imageUrl) {
    return (
      <span className={cls}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="feed-thumb-img" src={imageUrl} alt="" loading="lazy" />
      </span>
    );
  }

  return (
    <span
      className={cls}
      data-placeholder="true"
      style={{ backgroundImage: pickGradient(seed) }}
      aria-hidden="true"
    >
      <ImageIcon />
    </span>
  );
}
