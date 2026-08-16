import { prisma } from "@/lib/db";
import { promMetrics, promRegistry } from "@/lib/prom";

/**
 * GET /api/metrics — Prometheus scrape endpoint.
 *
 * Deliberately not wrapped in handle(): Prometheus expects the text exposition
 * format, not this project's JSON envelope, and a scrape every fifteen seconds
 * would otherwise write a RequestLog row every fifteen seconds and drown the
 * real traffic in the dashboard's own monitoring.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  // Unique clients is a database question, not a counter — refreshed at scrape
  // time so Prometheus records it alongside everything else.
  try {
    const distinct = await prisma.requestLog.findMany({
      distinct: ["clientKey"],
      select: { clientKey: true },
      where: { clientKey: { not: null } },
    });
    promMetrics.uniqueClients.set(distinct.length);
  } catch {
    // A scrape should still return the counters it can produce.
  }

  const body = await promRegistry.metrics();

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": promRegistry.contentType },
  });
}
