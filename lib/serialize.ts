import { prisma } from "@/lib/db";

/**
 * The relations a post is always returned with. Defined once so every endpoint
 * that returns a post returns the same shape — the frontend can rely on
 * `author` and `feeds` existing regardless of which route it called.
 */
export const POST_INCLUDE = {
  author: true,
  enclosures: true,
  feeds: { include: { feed: true } },
} as const;

type PostWithRelations = Awaited<
  ReturnType<typeof prisma.post.findFirstOrThrow<{ include: typeof POST_INCLUDE }>>
>;

/** Flattens the FeedPost join out of the response — clients want channels, not join rows. */
export function serializePost(post: PostWithRelations) {
  const { feeds, ...rest } = post;
  return {
    ...rest,
    feeds: feeds.map(({ feed, assignedAt }) => ({
      id: feed.id,
      slug: feed.slug,
      title: feed.title,
      assignedAt,
    })),
  };
}

export type SerializedPost = ReturnType<typeof serializePost>;
