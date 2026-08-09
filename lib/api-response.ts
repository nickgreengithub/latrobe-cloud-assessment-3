import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * One response envelope for every API route, so the frontend can unwrap
 * responses without knowing which endpoint produced them:
 *
 *   { ok: true,  data: T,    meta: {...} | null, error: null }
 *   { ok: false, data: null, meta: null,         error: { message, details } }
 */
export type ApiMeta = { total?: number; page?: number; limit?: number };

export type ApiEnvelope<T> = {
  ok: boolean;
  data: T | null;
  meta: ApiMeta | null;
  error: { message: string; details: unknown } | null;
};

export function ok<T>(data: T, meta?: ApiMeta, status = 200) {
  return NextResponse.json(
    { ok: true, data, meta: meta ?? null, error: null },
    { status },
  );
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { ok: false, data: null, meta: null, error: { message, details: details ?? null } },
    { status },
  );
}

/** Process start, used by /api/health to report uptime. */
export const STARTED_AT = Date.now();

/**
 * Writes one RequestLog row per API call.
 *
 * This happens here rather than in proxy.ts because Next's proxy runs on the
 * Edge runtime, which cannot open a database connection. It is deliberately
 * fire-and-forget: a failure to record telemetry must never turn a successful
 * request into an error.
 */
function logRequest(req: Request, status: number, startedAt: number) {
  const { pathname } = new URL(req.url);
  void prisma.requestLog
    .create({
      data: {
        method: req.method,
        path: pathname,
        statusCode: status,
        durationMs: Date.now() - startedAt,
        userAgent: req.headers.get("user-agent"),
      },
    })
    .catch(() => {});
}

/**
 * Wraps a route handler so every endpoint reports failures identically.
 *
 * Maps the errors that actually occur to the right status codes — Zod
 * validation to 400, Prisma "record not found" to 404, unique-constraint
 * violations to 409 — and anything unrecognised to a 500 that does not leak a
 * stack trace to the client.
 */
export async function handle(
  req: Request,
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const startedAt = Date.now();
  let response: NextResponse;

  try {
    response = await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      response = fail("Validation failed", 422, error.issues);
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        response = fail("Record not found", 404);
      } else if (error.code === "P2002") {
        const target = (error.meta as { target?: string[] } | undefined)?.target;
        response = fail("A record with that unique value already exists", 409, target);
      } else if (error.code === "P2003") {
        response = fail("Related record does not exist", 400);
      } else {
        response = fail("Database error", 500, error.code);
      }
    } else {
      console.error("Unhandled API error:", error);
      response = fail("Internal server error", 500);
    }
  }

  logRequest(req, response.status, startedAt);
  return response;
}

/** Shared list paging: default 20, hard cap 100. */
export function readPaging(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const rawLimit = Number(url.searchParams.get("limit") ?? 20) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
}
