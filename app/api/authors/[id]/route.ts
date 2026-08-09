import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { fail, handle, ok } from "@/lib/api-response";
import { authorUpdateSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  return handle(request, async () => {
    const { id } = await params;
    const author = await prisma.author.findUnique({
      where: { id },
      include: { posts: { orderBy: { pubDate: "desc" } } },
    });
    return author ? ok(author) : fail("Author not found", 404);
  });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  return handle(request, async () => {
    const { id } = await params;
    const body = authorUpdateSchema.parse(await request.json());
    const author = await prisma.author.update({ where: { id }, data: body });
    return ok(author);
  });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  return handle(request, async () => {
    const { id } = await params;
    // onDelete: SetNull — the author's posts stay published, simply unattributed.
    await prisma.author.delete({ where: { id } });
    return ok({ id, deleted: true });
  });
}
