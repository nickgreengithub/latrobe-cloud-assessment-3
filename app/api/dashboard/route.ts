import type { NextRequest } from "next/server";
import { handle, ok } from "@/lib/api-response";
import { collectDashboard } from "@/lib/dashboard";

/**
 * GET /api/dashboard — the reporting view's data, as JSON.
 *
 * A thin wrapper: the aggregation itself lives in lib/dashboard.ts so the
 * /dashboard page can render its first snapshot on the server without going
 * back out over HTTP to its own API.
 *
 * Accepts ?since=15m|1h|24h|7d.
 */
export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const url = new URL(request.url);
    return ok(await collectDashboard(url.searchParams.get("since")));
  });
}
