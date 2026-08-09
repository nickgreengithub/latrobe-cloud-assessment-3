import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { STARTED_AT, handle, ok } from "@/lib/api-response";

/** Parses ?since=15m | 1h | 24h | 7d into a cutoff Date. */
function parseSince(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d+)([mhd])$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const ms = { m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as "m" | "h" | "d"];
  return new Date(Date.now() - amount * ms);
}

/**
 * Request counts — the usage-monitoring endpoint.
 *
 * Every /api call writes a RequestLog row from the shared route wrapper, so
 * these figures are measured rather than estimated. Accepts ?since=1h.
 */
export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const url = new URL(request.url);
    const since = parseSince(url.searchParams.get("since"));
    const where = since ? { createdAt: { gte: since } } : {};

    const [total, windowed, byPath, byStatus, timing] = await prisma.$transaction([
      prisma.requestLog.count(),
      prisma.requestLog.count({ where }),
      prisma.requestLog.groupBy({
        by: ["path"],
        where,
        _count: { _all: true },
        _avg: { durationMs: true },
        orderBy: { _count: { path: "desc" } },
      }),
      prisma.requestLog.groupBy({
        by: ["statusCode"],
        where,
        _count: { _all: true },
        orderBy: { statusCode: "asc" },
      }),
      prisma.requestLog.aggregate({
        where,
        _avg: { durationMs: true },
        _max: { durationMs: true },
      }),
    ]);

    return ok({
      totalRequests: total,
      requestsInWindow: windowed,
      window: url.searchParams.get("since") ?? "all time",
      uptimeSeconds: Math.round((Date.now() - STARTED_AT) / 1000),
      averageDurationMs: Math.round(timing._avg.durationMs ?? 0),
      slowestDurationMs: timing._max.durationMs ?? 0,
      byPath: byPath.map((row) => ({
        path: row.path,
        count: row._count._all,
        averageDurationMs: Math.round(row._avg.durationMs ?? 0),
      })),
      byStatus: byStatus.map((row) => ({
        statusCode: row.statusCode,
        count: row._count._all,
      })),
    });
  });
}
