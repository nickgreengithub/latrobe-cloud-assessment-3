/**
 * Decorative placeholder illustration for the Feeds feature card on the home page.
 * Self-authored SVG (no licensing constraints). Swap for a real image later by
 * dropping one into /public and rendering it in place of this component.
 */
export function FeedArt() {
  return (
    <svg
      className="feature-art-svg"
      viewBox="0 0 480 360"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustration of a stack of announcement cards"
    >
      <defs>
        <linearGradient id="feedart-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="0.55" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="feedart-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.78" />
        </linearGradient>
      </defs>

      <rect width="480" height="360" fill="url(#feedart-bg)" />

      {/* Broadcast / RSS waves */}
      <g
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="10"
        strokeLinecap="round"
      >
        <path d="M52 316a112 112 0 0 1 112 112" />
        <path d="M52 250a178 178 0 0 1 178 178" />
        <path d="M52 184a244 244 0 0 1 244 244" />
      </g>
      <circle cx="60" cy="320" r="15" fill="#ffffff" fillOpacity="0.85" />

      {/* Floating announcement cards */}
      <g transform="rotate(-8 300 150)">
        <rect
          x="214"
          y="70"
          width="210"
          height="86"
          rx="16"
          fill="url(#feedart-card)"
        />
        <rect x="234" y="90" width="46" height="46" rx="10" fill="#6366f1" fillOpacity="0.85" />
        <rect x="294" y="94" width="112" height="10" rx="5" fill="#0f172a" fillOpacity="0.75" />
        <rect x="294" y="114" width="88" height="8" rx="4" fill="#0f172a" fillOpacity="0.35" />
        <rect x="294" y="130" width="70" height="8" rx="4" fill="#0f172a" fillOpacity="0.25" />
      </g>

      <g transform="rotate(-8 300 150)">
        <rect
          x="200"
          y="180"
          width="240"
          height="96"
          rx="16"
          fill="#ffffff"
          fillOpacity="0.96"
        />
        <rect x="222" y="202" width="52" height="52" rx="12" fill="#22d3ee" fillOpacity="0.9" />
        <rect x="288" y="208" width="126" height="11" rx="5.5" fill="#0f172a" fillOpacity="0.78" />
        <rect x="288" y="230" width="104" height="8" rx="4" fill="#0f172a" fillOpacity="0.35" />
        <rect x="288" y="247" width="80" height="8" rx="4" fill="#0f172a" fillOpacity="0.25" />
      </g>
    </svg>
  );
}
