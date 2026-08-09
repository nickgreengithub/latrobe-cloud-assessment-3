import { z } from "zod";

/**
 * Request-body schemas. Types are derived from these with z.infer so the API
 * and the frontend share a single definition rather than drifting apart.
 */

const slug = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be lowercase words separated by hyphens");

export const feedCreateSchema = z.object({
  slug,
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  link: z.url().optional(),
  language: z.string().min(2).max(10).default("en-AU"),
  imageUrl: z.url().optional(),
  ttl: z.number().int().min(1).max(1440).default(60),
});

export const feedUpdateSchema = feedCreateSchema.partial();

export const postCreateSchema = z.object({
  title: z.string().min(1).max(300),
  summary: z.string().min(1).max(1000),
  content: z.string().min(1),
  slug: slug.optional(),
  link: z.url().optional(),
  imageUrl: z.url().optional(),
  authorId: z.string().optional(),
  authorName: z.string().min(1).max(200).optional(),
  status: z.enum(["draft", "published"]).default("published"),
  pubDate: z.iso.datetime().optional(),
  /** Channel slugs this post is syndicated to — at least one. */
  feedSlugs: z.array(z.string()).min(1, "a post must belong to at least one channel"),
});

export const postUpdateSchema = postCreateSchema.partial().omit({ feedSlugs: true }).extend({
  feedSlugs: z.array(z.string()).min(1).optional(),
});

export const authorCreateSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.email().optional(),
  avatarUrl: z.url().optional(),
  bio: z.string().max(2000).optional(),
});

export const authorUpdateSchema = authorCreateSchema.partial();

export const subscriberCreateSchema = z.object({
  name: z.string().min(1).max(200),
  clientUrl: z.url(),
});

export type FeedCreate = z.infer<typeof feedCreateSchema>;
export type PostCreate = z.infer<typeof postCreateSchema>;
export type PostUpdate = z.infer<typeof postUpdateSchema>;
export type AuthorCreate = z.infer<typeof authorCreateSchema>;
export type SubscriberCreate = z.infer<typeof subscriberCreateSchema>;

/** Derives a URL-safe slug from a title, used when a post omits one. */
export function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
