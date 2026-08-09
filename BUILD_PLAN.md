# Assessment 2 — Full-Stack Build Plan

Backend, database, Docker and frontend integration for the RSS Server, building on the
Assessment 1 frontend already in this repository.

**How to use this document:** work through the stages in order. Each stage is a branch, a
file list, a verification step and a commit. Stop at the verification step every time — if it
fails, fix it before moving on. Do not run stages in parallel; stage N assumes stage N-1 is
green.

---

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| ORM + database | **Prisma + SQLite**, file on a Docker volume | Rubric names Prisma; single-service container has no startup-ordering failure mode on video day |
| GitHub Pages (A1) | **Keep**, gated behind `BUILD_TARGET=static` | Preserves the working A1 link; Docker build uses `output: "standalone"` |
| Scope | **Core 22 of 25 marks tonight** | Tests and README polish are drop-first (see [Drop-first list](#drop-first-list)) |
| Git | **Feature branches → PR → `main`** | Rubric: "separate branches for major features, a clean main branch" |
| RSS surface | **`/rss` plus `/rss/[slug]` per channel** | Coordinator guidance: keep it simple, point the client straight at an endpoint |

### Coordinator guidance (incorporated)

Subject coordinator advice, relayed via another student, on how simple the RSS surface should
be:

> I would keep it even simpler. Point it to `/rss`. Then the endpoint `/rss` will send
> whatever is current […] If you are implementing category of RSS feed — then yes dynamic
> page: `/rss/internship`, `/rss/hackathon`, `/rss/csitnews`. Client — receives RSS feeds,
> just point it to the different endpoint. […] There isn't much point for dynamic paging,
> unless it's just the admin side of things. Even that could just be done in a list of cards.

Three consequences, all of which **reduce** the work:

1. **One channel model, not two.** The category *is* the channel. A separate `Feed` model
   alongside `Category` was duplication — they merge into `Feed`, whose `slug` is the URL
   segment. One fewer model, one fewer CRUD resource, one fewer join.
2. **RSS moves to `/rss` and `/rss/[slug]`**, not `/api/feeds/[slug]/rss.xml`. Adds an
   aggregate "everything current" channel, which the original plan lacked.
3. **Paging stays on the admin API only.** `?page=&limit=` on `/api/posts` is kept — the
   6-mark criterion rewards "predictable, well structured" responses and it is already
   written — but no paginated UI. The feed list stays a list of cards.

**What this does not change:** the schema still needs real relationships to score on the
7-mark criterion. Keep the many-to-many, the author relation, enclosures and cascade rules.
The advice is about URL surface, not about flattening the data model into one table.

---

## Rubric map

| Criterion | Marks | Delivered by |
|---|---|---|
| Database schema and ORM | 7 | Stage 1 |
| APIs — CRUD and operational endpoints | 6 | Stages 2, 3, 4 |
| Dockerize | 3 | Stage 5 |
| Frontend–backend integration and operational output | 4 | Stage 6 |
| Code quality and GitHub | 5 | Branch/PR discipline throughout + Stage 7 |

Assessment 2 is **video-only**. The recording must show your face, voice and student ID, the
app running in Docker, the RSS Server sending feeds to the RSS Client, and API/database
behaviour. See [Video shot list](#video-shot-list).

---

## Time-boxed sprint

| Stage | Work | Budget | Marks at stake |
|---|---|---|---|
| 0 | Prep and config gate | 15 min | unblocks everything |
| 1 | Prisma schema, migration, seed | 60 min | 7 |
| 2 | CRUD route handlers | 60 min | 6 (shared) |
| 3 | Operational endpoints + request logging | 40 min | 6 (shared) |
| 4 | RSS 2.0 XML output | 30 min | makes it an RSS *server* |
| 5 | Dockerfile + compose | 45 min | 3 |
| 6 | Frontend rewire + RSS Client + Status | 75 min | 4 |
| 7 | README, PRs, video script | 30 min | 5 (shared) |
| — | Record and submit | 45 min | — |

If you fall behind: stages 1–4 plus 6 still demo off `npm run dev`. Stage 5 is the only one
that needs Docker on camera.

---

## Environment facts this plan is built on

Verified against `node_modules/next/dist/docs/` for the pinned Next version, **not** assumed:

- **Next.js 16.2.12.** Route Handlers live at `app/api/**/route.ts`.
- **`params` is a Promise.** `const { id } = await params` — this changed in Next 15 and is
  the single most common thing to get wrong here.
- **`RouteContext<'/api/posts/[id]'>`** is a globally available type helper in Next 16 for
  strongly-typed params. No import needed.
- **Middleware is called `proxy.ts` in Next 16.** A root-level `proxy.ts`, same API as the old
  `middleware.ts`. Using the old filename silently does nothing.
- **Route Handlers are not cached by default.** No `force-dynamic` needed for the API.
- **`output: "standalone"`** produces `.next/standalone/server.js` for Docker. `output:
  "export"` cannot run Route Handlers at all — hence the build gate in Stage 0.
- **`@prisma/client` is already on Next's auto-externalised package list.** You do *not* need
  `serverExternalPackages` for it.

---

## Stage 0 — Prep and the build-target gate

**Branch:** `chore/a2-setup`

### 0.1 Gate the build target

`next.config.ts` currently forces `output: "export"`, which cannot run an API. Rewrite so the
static export is opt-in:

```ts
import type { NextConfig } from "next";

const repoBasePath = "/latrobe-cloud-applications";
const isStatic = process.env.BUILD_TARGET === "static";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = isStatic
  ? {
      // Assessment 1 archive — GitHub Pages. No server, no API.
      output: "export",
      basePath: isProd ? repoBasePath : undefined,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      // Assessment 2 — full server build for Docker.
      output: "standalone",
      images: { unoptimized: true },
    };

export default nextConfig;
```

Then set the Pages workflow to use it — in `.github/workflows/deploy.yml`, change the build
step to:

```yaml
      - name: Build static export
        run: npx next build
        env:
          BUILD_TARGET: static
```

> The static export will fail to build once `app/api/**` exists, because export cannot emit
> Route Handlers. Fix by excluding the API from the static build: guard the API routes with a
> build-time check, or simply let the Pages workflow build from the last A1 tag. **If Pages
> breaks and time is short, disable the workflow — it earns no A2 marks.**

### 0.2 Fix `.gitignore`

`.env*` is currently ignored, which would silently swallow `.env.example`. Append:

```gitignore
# env — keep the template committed
!.env.example

# prisma — local database file, never committed
/prisma/*.db
/prisma/*.db-journal
/data
```

### 0.3 Install dependencies

```bash
npm i @prisma/client zod
npm i -D prisma tsx
npx prisma init --datasource-provider sqlite
```

### 0.4 `.env` and `.env.example`

```bash
# .env  (local, gitignored)
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_API_BASE=""

# .env.example  (committed)
DATABASE_URL="file:./dev.db"
NEXT_PUBLIC_API_BASE=""
```

`NEXT_PUBLIC_API_BASE` empty means "same origin" — the frontend calls relative `/api/...`
paths. It exists so the RSS Client page can be pointed at an explicit server URL on camera,
which is what makes the client/server split legible to the marker.

**Verify:** `npm run build` succeeds. **Commit:** `chore: gate build target and scaffold Prisma`

---

## Stage 1 — Database schema and ORM (7 marks)

**Branch:** `feat/prisma-schema`

This is the largest single criterion. The rubric wants a schema that "represents RSS feeds,
authors/posters, dates, blog data, images, links and other core fields" with "sensible
relationships that are easy to justify". Every model below exists to answer a question the
marker may ask on camera.

### 1.1 `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
  // Use Debian engines in the container; see Stage 5.
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

/// An RSS channel this server publishes — served at /rss/[slug].
/// The channel and the category are the same concept, deliberately: a post is
/// published to one or more named channels, and each channel is one RSS feed.
model Feed {
  id          String   @id @default(cuid())
  slug        String   @unique // the URL segment: /rss/careers
  title       String
  description String
  link        String
  language    String   @default("en-AU")
  imageUrl    String?
  ttl         Int      @default(60)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  posts FeedPost[]

  @@index([createdAt])
}

/// An RSS item — the blog data.
model Post {
  id        String   @id @default(cuid())
  guid      String   @unique
  slug      String   @unique
  title     String
  summary   String
  content   String
  link      String?
  imageUrl  String?
  pubDate   DateTime @default(now())
  status    String   @default("published") // draft | published — SQLite has no enums
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  authorId String?
  author   Author? @relation(fields: [authorId], references: [id], onDelete: SetNull)

  feeds      FeedPost[]
  enclosures Enclosure[]

  @@index([status, pubDate])
}

/// The poster.
model Author {
  id        String   @id @default(cuid())
  name      String
  email     String?  @unique
  avatarUrl String?
  bio       String?
  createdAt DateTime @default(now())

  posts Post[]
}

/// Explicit many-to-many join — chosen over an implicit relation so the
/// association itself can carry data and be queried directly. A post can be
/// syndicated to several channels (an internship notice is both Careers and News).
model FeedPost {
  feedId     String
  postId     String
  assignedAt DateTime @default(now())

  feed Feed @relation(fields: [feedId], references: [id], onDelete: Cascade)
  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@id([feedId, postId])
  @@index([postId])
}

/// RSS <enclosure> — attached media (images, audio).
model Enclosure {
  id          String @id @default(cuid())
  url         String
  mimeType    String
  lengthBytes Int    @default(0)

  postId String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@index([postId])
}

/// A registered RSS client polling this server. Powers /api/stats.
model Subscriber {
  id           String    @id @default(cuid())
  name         String
  clientUrl    String
  lastPolledAt DateTime?
  pollCount    Int       @default(0)
  createdAt    DateTime  @default(now())
}

/// Every /api request, written by proxy.ts. Powers /api/count.
model RequestLog {
  id         String   @id @default(cuid())
  method     String
  path       String
  statusCode Int
  durationMs Int
  userAgent  String?
  createdAt  DateTime @default(now())

  @@index([createdAt])
  @@index([path])
}
```

**Points to be ready to justify on camera:** the channel and the category are one model
because they are one concept — `/rss/careers` *is* the Careers feed, so a second table would
have been duplication; many-to-many `FeedPost` so one post can syndicate to several channels,
made explicit rather than implicit so the join can carry `assignedAt`; `SetNull` on author so
removing a person doesn't destroy their published posts; cascade from `Post → Enclosure` and
from either side into `FeedPost` so nothing is orphaned; `guid` and `slug` unique because RSS
requires a stable item identifier; composite index `[status, pubDate]` because that is exactly
the feed-rendering query; `status` as a string with a documented union because SQLite has no
native enum type.

### 1.2 `lib/db.ts`

```ts
import { PrismaClient } from "@prisma/client";

// Singleton: Next's dev server hot-reloads modules, and a fresh PrismaClient
// per reload exhausts database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 1.3 `prisma/seed.ts`

Port the three `SEED_FEEDS` posts out of `lib/feeds.ts` into real rows. The five names already
in `FEED_CATEGORIES` become the five channels — `careers`, `events`, `academic`,
`administrative`, `general` — each with a real channel title, description and link, so
`/rss/careers` works the moment you seed. (The coordinator's `internship` / `hackathon` /
`csitnews` examples are the same idea; keeping A1's five names earns the continuity point.)
Then three `Author` records matching the existing `author` strings, three `Post` records each
linked to its channel via `FeedPost`, and one `Subscriber` representing the LMS client. Use
`upsert` keyed on `slug` so re-seeding is idempotent — you will re-seed on camera.

Wire it up in `package.json`:

```json
  "prisma": { "seed": "tsx prisma/seed.ts" },
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio"
  }
```

### 1.4 Run it

```bash
npx prisma migrate dev --name init
npm run db:seed
npm run db:studio     # confirm rows exist, then close
```

> If Prisma warns about the default client output path, add
> `output = "../lib/generated/prisma"` to the generator block and update the `lib/db.ts`
> import to match. Do this only if warned — it changes the Docker copy step in Stage 5.

**Verify:** Prisma Studio shows 5 feeds/channels, 3 authors, 3 posts each joined to a channel
via `FeedPost`, and 1 subscriber.
**Commit + PR:** `feat(db): Prisma schema, migration and seed for the RSS server`

---

## Stage 2 — CRUD APIs (part of 6 marks)

**Branch:** `feat/api-crud`

The rubric wants responses that are "predictable, well structured and appropriate for the
frontend". One envelope, used everywhere, no exceptions.

### 2.1 `lib/api-response.ts`

```ts
import { NextResponse } from "next/server";

export type ApiMeta = { total?: number; page?: number; limit?: number };

export function ok<T>(data: T, meta?: ApiMeta, status = 200) {
  return NextResponse.json({ ok: true, data, meta: meta ?? null, error: null }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    { ok: false, data: null, meta: null, error: { message, details: details ?? null } },
    { status },
  );
}
```

Add a `handle()` wrapper that try/catches, maps Zod errors to 400 and Prisma `P2025`
(not found) to 404 and `P2002` (unique violation) to 409, and anything else to 500 without
leaking a stack trace.

### 2.2 `lib/validation.ts`

Zod schemas: `feedCreateSchema`, `feedUpdateSchema` (all fields optional), `postCreateSchema`
(including `feedSlugs: z.array(z.string()).min(1)`), `postUpdateSchema`, `authorCreateSchema`,
`subscriberCreateSchema`. Derive TypeScript types with `z.infer` so the frontend and API share
one definition.

### 2.3 Routes

| File | Methods | Behaviour |
|---|---|---|
| `app/api/feeds/route.ts` | GET, POST | list channels with post counts; create → 201 |
| `app/api/feeds/[id]/route.ts` | GET, PATCH, DELETE | 404 when missing; DELETE cascades the joins |
| `app/api/posts/route.ts` | GET, POST | filters `?feed=&q=&status=&page=&limit=`; body takes `feedSlugs: string[]` |
| `app/api/posts/[id]/route.ts` | GET, PATCH, DELETE | includes author, feeds, enclosures |
| `app/api/authors/route.ts` + `[id]` | GET, POST, PATCH, DELETE | |
| `app/api/subscribers/route.ts` | GET, POST | client registration |

There is no `/api/categories` — channels *are* the categories, so `/api/feeds` is the one
resource. That is one fewer CRUD pair to write and one fewer thing to explain on camera.

Dynamic route shape for Next 16 — note the awaited params:

```ts
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ok, fail } from "@/lib/api-response";

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/posts/[id]'>) {
  const { id } = await ctx.params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: { author: true, enclosures: true, feeds: { include: { feed: true } } },
  });
  return post ? ok(post) : fail("Post not found", 404);
}
```

`GET /api/posts` returns `meta: { total, page, limit }` so the frontend can paginate. Default
`limit` 20, hard cap 100.

**Verify:** full create→read→update→delete cycle on `/api/posts` via `curl`, each returning
the right status code. Keep these curl commands — they are your Stage 2 camera moment.

**Commit + PR:** `feat(api): CRUD route handlers for feeds, posts and authors`

---

## Stage 3 — Operational endpoints (part of 6 marks)

**Branch:** `feat/api-operational`

The rubric asks for "a working heartbeat/healthcheck endpoint **and at least one additional**
operational endpoint such as request counts, feed statistics or similar usage monitoring."
Build all three — it is cheap and it is explicitly what the criterion rewards.

### 3.1 `proxy.ts` (project root — Next 16's renamed middleware)

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = { matcher: "/api/:path*" };

export function proxy(request: NextRequest) {
  const started = Date.now();
  const response = NextResponse.next();
  // Prisma cannot run in the proxy runtime — hand the timing to the route layer.
  response.headers.set("x-request-start", String(started));
  return response;
}
```

> **Important:** the proxy runs on the Edge runtime and cannot open a database connection. Do
> the actual `RequestLog` write inside the `handle()` wrapper from Stage 2.2, which already
> wraps every route — one `prisma.requestLog.create()` in its `finally` block, fire-and-forget
> so logging can never fail a request. Document this decision in the README; it is a good
> "professional judgement" talking point.

### 3.2 `app/api/health/route.ts` — heartbeat

```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "uptimeSeconds": 412,
    "database": { "status": "connected", "latencyMs": 3 },
    "version": "2.0.0",
    "timestamp": "2026-08-09T11:22:33.000Z"
  }
}
```

The database check must be a real probe — `await prisma.$queryRaw\`SELECT 1\`` inside a
try/catch, returning HTTP **503** with `status: "degraded"` if it throws. A healthcheck that
returns 200 unconditionally is worth nothing, and stopping the DB on camera to show it flip
to 503 is a strong 30 seconds of video.

### 3.3 `app/api/count/route.ts` — request counts

Total requests, requests since process start, a per-path breakdown, a per-status breakdown,
and average duration — all aggregated from `RequestLog` with `groupBy`. Accepts `?since=1h`.

### 3.4 `app/api/stats/route.ts` — feed statistics

Posts per channel, posts per author, total/published/draft counts, latest `pubDate`,
subscriber count and total polls. Use `prisma.$transaction([...])` to run the aggregates as
one batch, and say so on camera.

**Verify:** hit each endpoint; browse the app; confirm `/api/count` numbers actually climb.
**Commit + PR:** `feat(api): heartbeat, request count and feed statistics endpoints`

---

## Stage 4 — RSS 2.0 output

**Branch:** `feat/rss-output`

Without this it is a CRUD app, not an RSS server.

Two files, both serving RSS at the top level rather than under `/api` — the coordinator's
"point it to `/rss`". Share one `lib/rss.ts` renderer between them.

| File | Route | Serves |
|---|---|---|
| `app/rss/route.ts` | `/rss` | **Whatever is current** — the latest published posts across every channel, newest first |
| `app/rss/[slug]/route.ts` | `/rss/careers` | One channel |

Both:

- Order by `pubDate` desc, default limit 20, `?limit=` accepted and capped at 50. (`/rss?limit=5`
  gives the "top 5 at once" behaviour Tony described, for free.)
- Return `Content-Type: application/rss+xml; charset=utf-8`.
- Return **404** for an unknown slug, not an empty channel — a client asking for a feed that
  does not exist should be told so.
- Increment the matching `Subscriber.pollCount` and stamp `lastPolledAt` when a
  `?subscriber=<id>` query param is present — this is what makes `/api/stats` interesting.

`app/rss/route.ts` and `app/rss/[slug]/route.ts` sit at different segments, so there is no
conflict — the restriction is only on a `route.ts` and a `page.tsx` in the *same* segment.

For `/rss`, the channel metadata is the server itself ("La Trobe RSS Server — all
announcements"); for `/rss/[slug]` it comes from the `Feed` row. Emit each post's channels as
`<category>` elements either way, so a client reading the aggregate feed can still tell what
came from where.

Required RSS 2.0 shape:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>…</title><link>…</link><description>…</description>
  <language>en-AU</language><lastBuildDate>…</lastBuildDate><ttl>60</ttl>
  <item>
    <title>…</title><link>…</link><description>…</description>
    <author>…</author><category>…</category>
    <pubDate>Sat, 09 Aug 2026 09:00:00 GMT</pubDate>
    <guid isPermaLink="false">…</guid>
    <enclosure url="…" type="image/jpeg" length="0" />
  </item>
</channel></rss>
```

Two things that will bite you: `pubDate` **must** be RFC-822 (`date.toUTCString()`, not
`toISOString()`), and every text value must be XML-escaped or wrapped in `<![CDATA[…]]>` —
the seed content contains `&` and typographic quotes that will produce malformed XML
otherwise.

**Verify:** `curl http://localhost:3000/rss` and `curl http://localhost:3000/rss/careers`,
then paste both into an RSS validator. Both must validate cleanly. Check `/rss/nonsense`
returns 404.
**Commit + PR:** `feat(rss): /rss aggregate and /rss/[slug] channel output in RSS 2.0`

---

## Stage 5 — Docker (3 marks)

**Branch:** `feat/docker`

### 5.1 `.dockerignore`

```
node_modules
.next
out
.git
.env
*.md
prisma/*.db
```

### 5.2 `Dockerfile`

Multi-stage, `node:22-slim` (Debian). **Use slim, not alpine** — Prisma's query engine needs
matching OpenSSL, and the Debian target avoids the musl engine mismatch that eats an hour at
exactly the wrong time.

```dockerfile
# ---- deps ----
FROM node:22-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM node:22-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL="file:/data/rss.db"
RUN npx prisma generate
RUN npm run build

# ---- runner ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL="file:/data/rss.db"
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Prisma CLI + engines + migrations, needed for `migrate deploy` at start-up.
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /data && chown -R nextjs:nodejs /data /app
USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
```

> `public/` does not currently exist in this repo — either create it with a `.gitkeep` or drop
> that COPY line, otherwise the build fails on a missing path.

### 5.3 `docker-compose.yml`

```yaml
services:
  rss-server:
    build: .
    container_name: rss-server
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "file:/data/rss.db"
      NODE_ENV: production
    volumes:
      - rss-data:/data
    restart: unless-stopped

volumes:
  rss-data:
```

### 5.4 Seeding the container

The volume starts empty, so the first run has a schema but no rows. Either add
`&& node node_modules/prisma/build/index.js db seed` to the CMD (needs `tsx` and
`prisma/seed.ts` in the image), or seed through the API on camera with the curl commands from
Stage 2 — which doubles as your CRUD demonstration. **The second option is less to go wrong.**

**Verify:**
```bash
docker compose up --build
docker ps                 # STATUS must read (healthy) — wait ~30s
curl localhost:3000/api/health
docker compose down && docker compose up   # data survives the restart
```
The healthy status and the surviving data are the two things to show on video.

**Commit + PR:** `feat(docker): multi-stage image, healthcheck and compose with persistent volume`

---

## Stage 6 — Frontend integration (4 marks)

**Branch:** `feat/frontend-api`, then `feat/rss-client`

### 6.1 Replace the localStorage layer

`lib/feeds.ts` currently *is* the data layer. Split it:

- `lib/types.ts` — keep `FeedItem`, widen it to the API shape (author object, `feeds` array).
  Keep `formatFeedDate`. `FEED_CATEGORIES` stops being a hardcoded constant and becomes a
  fetch of `/api/feeds` — the channels now live in the database, and the existing category
  filter in `FeedList` becomes a channel filter with no visual change.
- `lib/api.ts` — typed fetch client: `listPosts(params)`, `getPost(id)`, `createPost(body)`,
  `updatePost(id, body)`, `deletePost(id)`, `listFeeds()`, `getHealth()`, `getCount()`,
  `getStats()`. All read `process.env.NEXT_PUBLIC_API_BASE || ""` as the prefix, unwrap the
  `{ ok, data }` envelope, and throw a typed `ApiError` on `ok: false`.
- Delete the localStorage functions. Do not leave both paths in — a hybrid will read as
  unfinished work.

### 6.2 Rewire the components

`FeedList`, `FeedForm`, `FeedDetail` swap their `loadFeeds()`/`addFeed()`/`deleteFeed()` calls
for the API client. Each needs a **loading**, **empty** and **error** state — the error state
matters on camera, because stopping the container and showing the UI degrade gracefully is
exactly the "operational output" the criterion asks for.

`app/feeds/[id]/page.tsx` currently has `generateStaticParams` and `dynamicParams = false` for
the static export. Remove both — the page is server-rendered now.

### 6.3 New page: `/client` — the RSS Client

This is the one the rubric names directly: *"the video shows the RSS Server sending feeds to
the RSS Client"*.

- A URL input pre-filled with `/rss`, a **Fetch feed** button, and a row of one-click channel
  buttons (`/rss`, `/rss/careers`, `/rss/events`, …) built from `/api/feeds`. Switching
  channels is the demonstration — "the client just points at a different endpoint".
- Fetch the XML, parse with `new DOMParser().parseFromString(text, "application/xml")`, and
  render the channel metadata plus the items in the existing card styling.
- Show the raw XML in a collapsible panel — proves it is genuinely RSS crossing the wire, not
  an internal function call.
- Display the HTTP status, content-type and round-trip time. Cheap to build, and it makes the
  server→client transport visible.

### 6.4 New page: `/status` — operational dashboard

Poll `/api/health`, `/api/count` and `/api/stats` every 5 seconds. Show heartbeat state, DB
latency, request totals, the per-endpoint breakdown, and posts-per-channel. This is the
"operational output" wording in the criterion, and it is the foundation of the Assessment 3
dashboard.

### 6.5 Navigation

Add **Client** and **Status** to `NAV` in `components/Header.tsx` with icons from
`components/icons.tsx`.

**Verify:** create a post in the UI → see it in Prisma Studio → see it appear in `/client`
after re-fetching the feed → watch `/status` counters climb.
**Commit + PRs:** `feat(frontend): consume the REST API`, `feat(client): RSS client and status dashboard`

---

## Stage 7 — Documentation and repository polish (5 marks)

**Branch:** `chore/docs`

- **README rewrite:** what the project is, architecture diagram (server → RSS → client), setup
  for local dev, setup for Docker, the full endpoint table, the schema and its relationships,
  environment variables, and the A1→A2 continuity note. Replace the `<you>/<repo>` placeholder
  with the real URL.
- **`lib/student.ts`:** update `assessmentTitle` to Assessment 2.
- **About page:** update the A1-era copy that says posts are held in local storage — it is now
  factually wrong and a marker will notice.
- **`VERBAL_JUSTIFICATION.md` / `talking_points.md`:** extend for A2 rather than replacing.
- Confirm `npm run lint` is clean and `node_modules` is absent from the repo.

**Commit + PR:** `docs: A2 architecture, endpoints and setup`

---

## Video shot list

3–8 minutes. Rehearse once; record in one take if you can.

| # | Shot | Say |
|---|---|---|
| 1 | Face + student ID card to camera | Name, student number, subject |
| 2 | `docker compose up --build` in a shell | "The whole server, database and frontend build into one container" |
| 3 | `docker ps` showing `(healthy)` | "Docker's own healthcheck is polling `/api/health`" |
| 4 | Browser → `/api/health` | Point out the real `SELECT 1` DB probe |
| 5 | Prisma Studio or the schema file | Walk the relations: Feed→Post→Enclosure, Post↔Category, cascade rules |
| 6 | `curl` POST a new post → 201 | Then GET, PATCH, DELETE — the full CRUD cycle |
| 7 | Frontend `/feeds` showing the new post | "Same database, read through the API" |
| 8 | **`/client` page fetching `/rss`** | **"The RSS Server sending a feed to the RSS Client"** — the money shot |
| 9 | Switch the client to `/rss/careers`, then `/rss/events` | "Same client, different endpoint — one channel per category" |
| 10 | Expand the raw XML panel | "Genuine RSS 2.0 over HTTP" |
| 11 | `/status` counters climbing | Request counts and feed statistics |
| 12 | Stop the container, reload the UI | Graceful error state, then restart and show data survived the volume |

---

## Drop-first list

In order, if the clock beats you:

1. Vitest API tests — not named in the rubric.
2. `/status` dashboard — nice, but `/api/stats` in a browser tab covers the criterion.
3. README schema diagram — a paragraph of prose scores nearly the same.
4. GitHub Pages workflow — zero A2 marks; disable it if it fights you.
5. Subscriber poll tracking — `/api/stats` still works without it.

**Never drop:** the schema, `/api/health`, one working CRUD resource, `/rss`, the Dockerfile,
the `/client` page. Those are 22 of the 25 marks. If everything else burns, `/rss` plus a
client that renders it is the assessment.

---

## Submission checklist

- [ ] `docker compose up --build` works from a clean clone
- [ ] `/api/health` returns healthy with a real DB probe
- [ ] Full CRUD demonstrated on at least one resource
- [ ] `/api/count` and `/api/stats` return live data
- [ ] `/rss` and `/rss/[slug]` pass an RSS validator
- [ ] `/client` page renders a feed fetched from the server, and switches channels
- [ ] Feature branches merged to `main` via PRs; `main` is clean
- [ ] README current; no `node_modules` in the repo
- [ ] `lib/student.ts` says Assessment 2
- [ ] Video 3–8 min with face, voice and student ID
- [ ] Zip **without** `node_modules`, plus the GitHub repo link
- [ ] AI acknowledgement submitted
- [ ] Turnitin similarity score generated

---

## Known traps

1. **`params` is a Promise.** `await params` in every dynamic route or you get an object
   Promise where you expected a string.
2. **`proxy.ts`, not `middleware.ts`** — Next 16 renamed it. The old name fails silently.
3. **No Prisma in the proxy.** Edge runtime. Log requests from the route wrapper instead.
4. **`output: "export"` cannot coexist with Route Handlers.** Hence the Stage 0 gate.
5. **RFC-822 dates in RSS.** `toUTCString()`, never `toISOString()`.
6. **Escape XML.** The seed content has `&` and smart quotes in it.
7. **Prisma engines in Docker.** Debian base, and copy `.prisma`, `@prisma` and `prisma` into
   the runner stage — output tracing does not reliably catch them.
8. **The SQLite file must be writable by the non-root user.** `chown -R nextjs:nodejs /data`
   before `USER nextjs`.
9. **`.env*` is gitignored**, so `.env.example` needs the `!` exception or it never gets
   committed.
10. **`public/` does not exist yet.** Create it or remove that Dockerfile COPY line.
