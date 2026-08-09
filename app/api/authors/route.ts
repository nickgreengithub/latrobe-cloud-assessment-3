import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api-response";
import { authorCreateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  return handle(request, async () => {
    const authors = await prisma.author.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    return ok(
      authors.map(({ _count, ...author }) => ({ ...author, postCount: _count.posts })),
      { total: authors.length },
    );
  });
}

export async function POST(request: NextRequest) {
  return handle(request, async () => {
    const body = authorCreateSchema.parse(await request.json());
    const author = await prisma.author.create({ data: body });
    return ok(author, undefined, 201);
  });
}
