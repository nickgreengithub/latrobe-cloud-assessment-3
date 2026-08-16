# La Trobe RSS Server — Assessment 3

**Nicholas Green · 22840097 · CSE5006**

An RSS server for university announcements, and the LMS-style client that
subscribes to it. Announcements are authored through a web interface, stored in
a relational database, exposed over a REST API, and published as valid **RSS
2.0** that any standards-compliant reader can consume.

Assessment 1 built the frontend. Assessment 2 added everything behind it: the
schema, the API, the RSS output and the Docker packaging. Assessment 3 makes the
running system observable — a data-driven dashboard, OpenTelemetry tracing,
Prometheus metrics, and end-to-end, load and accessibility testing.

---

## Architecture

```
    ┌──────────────────────────────┐
    │  Browser — server console    │   author, search and file posts
    │  /  /feeds  /feeds/new       │
    └───────────────┬──────────────┘
                    │  fetch(), JSON envelope
                    ▼
    ┌──────────────────────────────┐
    │  REST API   /api/*           │   CRUD + health, count, stats
    │  Next.js Route Handlers      │
    └───────────────┬──────────────┘
                    │  Prisma 7 + better-sqlite3 adapter
                    ▼
    ┌──────────────────────────────┐
    │  SQLite  /data/rss.db        │   on a Docker named volume
    └───────────────┬──────────────┘
                    │  rendered to XML
                    ▼
    ┌──────────────────────────────┐
    │  RSS 2.0    /rss             │   aggregate channel
    │             /rss/[slug]      │   one channel per category
    └───────────────┬──────────────┘
                    │  HTTP, application/rss+xml
                    ▼
    ┌──────────────────────────────┐
    │  RSS Client  /client         │   DOMParser, renders the feed
    └──────────────────────────────┘
```

Everything runs in **one container**. SQLite was chosen over a separate database
service deliberately: a single process has no start-up ordering to get wrong,
and the data still persists because the database file lives on a named volume
rather than in the container layer.

---

## Running it

### Docker (the intended way)

```bash
docker compose up --build
```

Then open <http://localhost:3000>. The entrypoint applies migrations and seeds
the baseline channels before starting the server, so a clean checkout with an
empty volume comes up working with no manual step. Both operations are
idempotent.

```bash
docker ps                     # STATUS reads (healthy) after ~30s
docker compose down           # stop
docker compose down -v        # stop and destroy the database volume
```

The healthcheck polls `/api/health`, which runs a real `SELECT 1` against the
database — a container is only "healthy" if its data layer answers.

### Local development

```bash
cp .env.example .env
npm install
npm run db:migrate        # create the SQLite file and apply migrations
npm run db:seed           # load the baseline channels and sample posts
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | development server |
| `npm run build` / `npm start` | production build and serve |
| `npm run lint` | ESLint |
| `npm run db:migrate` | create and apply a migration |
| `npm run db:seed` | seed baseline data (idempotent) |
| `npm run db:studio` | browse the database in Prisma Studio |
| `npm run db:reset` | drop and rebuild the database |

---

## Database schema

Prisma with SQLite. Seven models, each earning its place in the RSS use case.

| Model | Represents | Notable relationships |
| --- | --- | --- |
| `Feed` | An RSS **channel**, served at `/rss/[slug]` | many-to-many with `Post` |
| `Post` | An RSS **item** — the blog data | belongs to an `Author`, has `Enclosure`s |
| `Author` | The poster | one-to-many with `Post` |
| `FeedPost` | Explicit join: which posts are in which channels | carries `assignedAt` |
| `Enclosure` | Attached media (`<enclosure>`) | cascades with its post |
| `Subscriber` | A registered RSS client | powers polling stats |
| `RequestLog` | One row per API request | powers `/api/count` |

Decisions worth stating:

- **A channel and a category are one model, not two.** `/rss/careers` *is* the
  Careers feed, so a separate `Category` table would have been duplication.
- **`FeedPost` is an explicit join, not an implicit many-to-many**, so the
  association can carry its own data and be queried directly. One post can
  syndicate to several channels — an internship notice is both Careers and
  General.
- **`onDelete: SetNull` on the author relation.** Removing a person must not
  destroy the posts they published; the items stay in the feed, unattributed.
- **`onDelete: Cascade` into `FeedPost` and `Enclosure`**, so deleting a post or
  a channel never leaves orphaned rows.
- **`guid` and `slug` are unique** because RSS requires a stable item identifier.
- **Composite index on `[status, pubDate]`** because that is exactly the query
  that renders a feed.
- **`status` is a string with a documented union** (`draft` | `published`)
  because SQLite has no native enum type.

---

## API

Every endpoint returns the same envelope, so the frontend never has to guess a
response shape:

```jsonc
{ "ok": true,  "data": …,   "meta": { "total": 3, "page": 1, "limit": 20 }, "error": null }
{ "ok": false, "data": null, "meta": null, "error": { "message": "…", "details": … } }
```

### CRUD

| Method | Route | Notes |
| --- | --- | --- |
| `GET` `POST` | `/api/posts` | filters: `?feed=&q=&status=&page=&limit=` |
| `GET` `PATCH` `DELETE` | `/api/posts/[id]` | accepts an id **or** a slug |
| `GET` `POST` | `/api/feeds` | channels, with post counts |
| `GET` `PATCH` `DELETE` | `/api/feeds/[id]` | accepts an id **or** a slug |
| `GET` `POST` | `/api/authors` | |
| `GET` `PATCH` `DELETE` | `/api/authors/[id]` | |
| `GET` `POST` | `/api/subscribers` | client registration |

Status codes are meaningful: `201` on create, `404` for a missing record, `409`
on a unique-constraint violation, `422` for a validation failure (Zod), `400`
for an unknown channel slug.

### Operational

| Route | Purpose |
| --- | --- |
| `/api/health` | Heartbeat. Real `SELECT 1` probe; returns **503** and `status: "degraded"` if the database is unreachable. |
| `/api/count` | Request counts from `RequestLog` — totals, per-path and per-status breakdowns, timing. Accepts `?since=1h`. |
| `/api/stats` | Feed statistics — posts per channel, posts per author, draft/published split, subscriber polling. |

Request logging is written by the shared route wrapper rather than by
`proxy.ts`, because Next's proxy runs on the Edge runtime and cannot open a
database connection. It is fire-and-forget: telemetry can never fail a request.

### RSS

| Route | Serves |
| --- | --- |
| `/rss` | Everything current, newest first, across all channels |
| `/rss/[slug]` | One channel, e.g. `/rss/careers` |

Both accept `?limit=` (default 20, capped at 50) and `?subscriber=<id>` to
record a poll. An unknown slug returns **404** rather than a valid-but-empty
channel — a client asking for a feed that does not exist should be told so.

```bash
curl http://localhost:3000/rss
curl http://localhost:3000/rss/careers
curl -X POST http://localhost:3000/api/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"Notice","summary":"…","content":"…","feedSlugs":["careers"]}'
```

---

## Frontend

| Route | Purpose |
| --- | --- |
| `/` | Landing page |
| `/feeds` | Post browser — search and channel filter run server-side |
| `/feeds/[id]` | Post detail, rendered on demand |
| `/feeds/new` | Publish a post to one or more channels |
| `/client` | **RSS Client** — subscribes to the feeds over HTTP |
| `/about` | Student details and walkthrough video |
| `/settings` | Theme, layout density, server connection check |

The Assessment 1 interface is carried over intact — component architecture,
hamburger menu, light/dark themes, cookie-persisted preferences, breadcrumbs,
keyboard and ARIA support. What changed is where the data comes from:
`lib/feeds.ts` and its `localStorage` layer were **deleted**, not left running
alongside the API, and every view now has explicit loading, empty and error
states.

`/client` is a genuine feed reader. It issues an HTTP request, receives XML,
and parses it with `DOMParser` exactly as a third-party client would. It shows
the HTTP status, content type, round-trip time and the raw XML, so it is
visible that real RSS crossed the network rather than an internal function call
being dressed up as one.

---

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite location. `file:/data/rss.db` in Docker. |
| `SITE_URL` | derived from the request | Absolute base for links inside the RSS feed. |
| `NEXT_PUBLIC_API_BASE` | `""` (same origin) | Lets the client target a different server. |
| `BUILD_TARGET` | unset | `static` builds the Assessment 1 GitHub Pages export. |

---

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 with the
better-sqlite3 driver adapter · SQLite · Zod · Docker

---

## Project continuity

Assessment 1 established the frontend, usability and accessibility layer.
Assessment 2 adds the API, database and Docker packaging. Assessment 3 builds on
this with dashboard views, simulated input records, rule-based interpretation
and reporting — which is why `RequestLog`, `Subscriber` and `/api/stats` already
exist: the operational data those features need is being collected now.
