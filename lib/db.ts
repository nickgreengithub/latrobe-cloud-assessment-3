import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

/**
 * Prisma 7 talks to the database through a driver adapter rather than a bundled
 * Rust query engine, so the SQLite driver is constructed explicitly here.
 *
 * The client is a singleton because Next's dev server hot-reloads modules, and
 * a fresh PrismaClient per reload leaks database connections until the process
 * runs out of them.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
