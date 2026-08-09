import type { NextRequest } from "next/server";

/**
 * Absolute base URL for the current request.
 *
 * RSS requires absolute links, and the server does not know its own public
 * address ahead of time — it differs between `next dev`, the Docker container
 * and any host it is deployed behind. Deriving it from the request (honouring
 * the standard proxy headers) keeps the emitted feed correct in all three.
 */
export function siteUrlFrom(request: NextRequest) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return "http://localhost:3000";

  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${proto}://${host}`;
}
