/**
 * Seeds the five RSS channels and the sample posts carried over from the
 * Assessment 1 frontend, so /rss and /rss/[slug] return real content the
 * moment the database exists.
 *
 * Every write is an upsert keyed on a natural unique column, which makes the
 * seed idempotent — it can be re-run against a populated database without
 * duplicating rows.
 */
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL ?? "file:./dev.db";
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

const SITE = process.env.SITE_URL ?? "http://localhost:3000";

/** The five Assessment 1 categories become the five published channels. */
const FEEDS = [
  {
    slug: "careers",
    title: "Careers",
    description:
      "Internships, graduate programs and employability announcements for students.",
  },
  {
    slug: "events",
    title: "Events",
    description: "Hackathons, workshops and campus events open to students.",
  },
  {
    slug: "academic",
    title: "Academic",
    description: "Subject notices, lab reminders and assessment updates.",
  },
  {
    slug: "administrative",
    title: "Administrative",
    description: "Enrolment, timetabling and student administration notices.",
  },
  {
    slug: "general",
    title: "General",
    description: "University-wide announcements that do not fit another channel.",
  },
];

const AUTHORS = [
  {
    name: "Careers & Employability",
    email: "careers@latrobe.edu.au",
    bio: "Publishes internship and graduate opportunities.",
  },
  {
    name: "Student Engagement",
    email: "engagement@latrobe.edu.au",
    bio: "Publishes events and volunteering calls.",
  },
  {
    name: "Subject Coordinator",
    email: "coordinator@latrobe.edu.au",
    bio: "Publishes subject and assessment notices for CSE2CWA / CSE5CWA.",
  },
];

const POSTS = [
  {
    slug: "industry-internship-expressions-of-interest",
    title: "Industry internship expressions of interest",
    summary:
      "Partner organisations are offering short internship placements for cloud and web students.",
    content:
      "Several partner organisations are seeking expressions of interest for short industry internships. An admin publishes this as a categorised post on the RSS server, which the server then serves to subscribed client applications.\n\nThe post is stored in SQLite through Prisma and rendered into RSS 2.0 on request, so any standards-compliant client can subscribe to it.",
    authorName: "Careers & Employability",
    feedSlugs: ["careers", "general"],
    pubDate: new Date("2026-07-18T09:00:00.000Z"),
    enclosure: {
      url: `${SITE}/media/internship.jpg`,
      mimeType: "image/jpeg",
      lengthBytes: 0,
    },
  },
  {
    slug: "campus-hackathon-volunteer-facilitators-needed",
    title: "Campus hackathon — volunteer facilitators needed",
    summary:
      "Facilitators needed for a weekend cloud-native hackathon. Sign-up closes Friday.",
    content:
      "We need twenty student facilitators for a weekend hackathon focused on cloud-native tooling. Shifts are short and training is provided. The admin files it as an Events post so client apps subscribed to the server receive it.\n\nBecause a post can belong to more than one channel, this notice appears in both the Events feed and the aggregate feed at /rss.",
    authorName: "Student Engagement",
    feedSlugs: ["events"],
    pubDate: new Date("2026-07-20T18:00:00.000Z"),
    enclosure: null,
  },
  {
    slug: "module-4-dynamic-pages-and-list-rendering",
    title: "Module 4 — dynamic pages and list rendering",
    summary:
      "Lab reminder: practice list rendering and dynamic routes before Assessment 1 submission.",
    content:
      "This week's lab covers advanced React patterns: mapping collections, dynamic segments, and navigation between list and detail views. Those patterns map directly onto this server UI: one view lists the posts, another expands a single post.\n\nThe same data now arrives from the API rather than local storage, which is the change Assessment 2 introduces.",
    authorName: "Subject Coordinator",
    feedSlugs: ["academic"],
    pubDate: new Date("2026-07-22T08:30:00.000Z"),
    enclosure: null,
  },
];

async function main() {
  for (const feed of FEEDS) {
    await prisma.feed.upsert({
      where: { slug: feed.slug },
      update: { title: feed.title, description: feed.description },
      create: { ...feed, link: `${SITE}/rss/${feed.slug}` },
    });
  }

  const authorsByName = new Map<string, string>();
  for (const author of AUTHORS) {
    const row = await prisma.author.upsert({
      where: { email: author.email },
      update: { name: author.name, bio: author.bio },
      create: author,
    });
    authorsByName.set(author.name, row.id);
  }

  for (const post of POSTS) {
    const { feedSlugs, authorName, enclosure, ...fields } = post;

    const row = await prisma.post.upsert({
      where: { slug: fields.slug },
      update: { title: fields.title, summary: fields.summary, content: fields.content },
      create: {
        ...fields,
        guid: `${SITE}/feeds/${fields.slug}`,
        link: `${SITE}/feeds/${fields.slug}`,
        status: "published",
        authorId: authorsByName.get(authorName),
      },
    });

    // Re-point the joins rather than adding to them, so re-seeding is idempotent.
    await prisma.feedPost.deleteMany({ where: { postId: row.id } });
    for (const slug of feedSlugs) {
      const feed = await prisma.feed.findUnique({ where: { slug } });
      if (feed) {
        await prisma.feedPost.create({ data: { feedId: feed.id, postId: row.id } });
      }
    }

    if (enclosure) {
      await prisma.enclosure.deleteMany({ where: { postId: row.id } });
      await prisma.enclosure.create({ data: { ...enclosure, postId: row.id } });
    }
  }

  // The LMS is the client this server exists to feed.
  await prisma.subscriber.upsert({
    where: { id: "seed-lms-client" },
    update: {},
    create: {
      id: "seed-lms-client",
      name: "La Trobe LMS (RSS Client)",
      clientUrl: `${SITE}/client`,
    },
  });

  const [feeds, authors, posts, joins, subscribers] = await Promise.all([
    prisma.feed.count(),
    prisma.author.count(),
    prisma.post.count(),
    prisma.feedPost.count(),
    prisma.subscriber.count(),
  ]);
  console.log(
    `Seeded: ${feeds} channels, ${authors} authors, ${posts} posts, ${joins} channel assignments, ${subscribers} subscriber.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
