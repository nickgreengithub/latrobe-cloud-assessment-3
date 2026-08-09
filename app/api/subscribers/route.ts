import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api-response";
import { subscriberCreateSchema } from "@/lib/validation";

/**
 * Registered RSS clients. Registration is what lets /api/stats report who is
 * polling this server and how often.
 */
export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
    });
    return ok(subscribers, { total: subscribers.length });
  });
}

export async function POST(request: NextRequest) {
  return handle(request, async () => {
    const body = subscriberCreateSchema.parse(await request.json());
    const subscriber = await prisma.subscriber.create({ data: body });
    return ok(subscriber, undefined, 201);
  });
}
