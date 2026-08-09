import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { STARTED_AT, handle } from "@/lib/api-response";
import { NextResponse } from "next/server";

/**
 * Heartbeat / healthcheck. Docker's HEALTHCHECK polls this endpoint.
 *
 * The database check is a real round-trip (SELECT 1), not an assumption — a
 * healthcheck that returns 200 unconditionally tells an operator nothing. If
 * the probe throws, the endpoint reports "degraded" and answers 503 so the
 * container is correctly marked unhealthy.
 */
export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const probeStarted = Date.now();
    let database: { status: string; latencyMs: number | null; error?: string };
    let healthy: boolean;

    try {
      await prisma.$queryRaw`SELECT 1`;
      database = { status: "connected", latencyMs: Date.now() - probeStarted };
      healthy = true;
    } catch (error) {
      database = {
        status: "unreachable",
        latencyMs: null,
        error: error instanceof Error ? error.message : "unknown error",
      };
      healthy = false;
    }

    return NextResponse.json(
      {
        ok: healthy,
        data: {
          status: healthy ? "healthy" : "degraded",
          uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
          database,
          version: process.env.npm_package_version ?? "2.0.0",
          timestamp: new Date().toISOString(),
        },
        meta: null,
        error: healthy ? null : { message: "Database probe failed", details: null },
      },
      { status: healthy ? 200 : 503 },
    );
  });
}
