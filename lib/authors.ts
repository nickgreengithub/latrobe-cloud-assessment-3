import { prisma } from "@/lib/db";
import { slugify } from "@/lib/validation";

/**
 * Finds the author with this name, creating one only if nobody matches.
 *
 * The UI lets a post be filed under an author's name rather than their id, so
 * this is the join between a typed string and a real row. Matching on the
 * existing name first matters: creating unconditionally would give every
 * announcement its own duplicate "Careers & Employability", and the
 * posts-per-author figures in /api/stats would be meaningless.
 *
 * A placeholder email is only minted for genuinely new authors, because `email`
 * is unique and a real address is not known at this point.
 */
export async function resolveAuthorByName(name: string) {
  const trimmed = name.trim();

  const existing = await prisma.author.findFirst({ where: { name: trimmed } });
  if (existing) return existing;

  return prisma.author.create({
    data: { name: trimmed, email: `${slugify(trimmed)}@example.invalid` },
  });
}
