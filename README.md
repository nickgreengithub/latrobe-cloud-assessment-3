# La Trobe RSS Server — Assessment 3

**Nicholas Green · 22840097 · CSE5006**

**Repository:** <https://github.com/nickgreengithub/latrobe-cloud-assessment-3>

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

Assessment 3 adds the layer that watches all of it:

```
    ┌──────────────────────────────┐
    │  Dashboard  /dashboard       │   health, alerts, per-feed and
    └───────────────┬──────────────┘   per-client reporting
                    │  /api/dashboard — one collection, one point in time
                    ▼
    ┌──────────────────────────────┐
    │  RequestLog  ·  FeedFetch    │   every request and every feed delivery
    └──────────────────────────────┘

    rss-server ──OTLP/HTTP──▶ otel-collector ──▶ Jaeger      :16686  traces
         ▲
         └──────── scrape /api/metrics ──────── Prometheus   :9090   metrics
```

Traces answer "what happened inside this one request"; metrics answer "what is
happening across all of them"; the database answers "which feed, which client,
how many items". The application exports OTLP and knows nothing about its
telemetry backend — replacing Jaeger is a change to
`otel-collector-config.yaml`, not to application code.

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

This starts four services:

| Service | Port | What it is |
| --- | --- | --- |
| `rss-server` | 3000 | the application, its API and the SQLite database |
| `jaeger` | 16686 | trace inspection UI |
| `prometheus` | 9090 | metrics queries |
| `otel-collector` | 4318 | receives OTLP from the app, fans it out |

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
| `npx playwright test` | end-to-end tests (starts its own server) |
| `./load/run-stages.sh` | staged JMeter load test |

---

## Database schema

Prisma with SQLite. Eight models, each earning its place in the RSS use case.

| Model | Represents | Notable relationships |
| --- | --- | --- |
| `Feed` | An RSS **channel**, served at `/rss/[slug]` | many-to-many with `Post` |
| `Post` | An RSS **item** — the blog data | belongs to an `Author`, has `Enclosure`s |
| `Author` | The poster | one-to-many with `Post` |
| `FeedPost` | Explicit join: which posts are in which channels | carries `assignedAt` |
| `Enclosure` | Attached media (`<enclosure>`) | cascades with its post |
| `Subscriber` | A registered RSS client | powers polling stats |
| `RequestLog` | One row per HTTP request, including feed polls | powers `/api/count` and `/dashboard` |
| `FeedFetch` | One row per RSS feed delivery | items served, duration, feed-level errors |

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
- **`RequestLog.clientKey` is a hash, not an address.** Counting unique clients
  needs to tell callers apart, not know who they are, so it stores the first 16
  characters of `sha256(ip + user-agent)`. The count is exact and there is no
  personal information in the database to protect.
- **`FeedFetch` is separate from `RequestLog`** because they answer different
  questions. `RequestLog` records that an HTTP request happened and what status
  it returned; `FeedFetch` records what the feed itself did — how many items
  went out, and whether the channel was unknown or merely empty. A feed
  returning 200 with zero items is invisible in HTTP terms and is exactly the
  failure worth alerting on.

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
| `/api/dashboard` | Everything `/dashboard` needs, collected in one pass. Accepts `?since=15m\|1h\|24h\|7d`. |
| `/api/metrics` | Prometheus text exposition — request, feed poll, duration and unique-client series. |

Request logging is written by `lib/metrics.ts` rather than by `proxy.ts`,
because Next's proxy runs on the Edge runtime and cannot open a database
connection. It is fire-and-forget: telemetry can never fail a request.

The RSS routes call it themselves. They return XML directly and never pass
through the API wrapper, so until Assessment 3 the busiest route on the server
— the feed poll — was the one route the metrics could not see.

`/api/dashboard` and `/api/metrics` are excluded from the request log. The
dashboard polls every ten seconds and Prometheus scrapes every fifteen; left
in, they become the busiest endpoints on the server within a minute and
inflate the very totals they are reporting.

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
| `/dashboard` | **Operational dashboard** — health, alerts, reporting views |
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

## Observability

### The dashboard

`/dashboard` reads one endpoint, not three. The alternative — the browser
calling `/api/health`, `/api/count` and `/api/stats` and stitching the results
together — is three round trips that must agree with each other, which is
three chances to render a panel contradicting the panel beside it. One
collection, one point in time.

The first snapshot is rendered on the server, so the page arrives populated
rather than empty-then-filled; the client polls from there.

**It is a fixed stage, not a scrolling column.** An operational dashboard is
something you glance at, and a figure below the fold is a figure nobody reads.
The page itself never scrolls; panels that can grow without limit — the feed
table, the activity list — scroll inside themselves. An end-to-end test
asserts the page has no scrollable overflow, so the property cannot quietly
regress.

Four sections, switched from the dashboard's own bar, which also carries the
window filter, the last-updated time and the live indicator:

| Section | Shows |
| --- | --- |
| Overview | six KPI tiles, the activity pulse chart, and the alert list |
| Feeds | requests per feed, and the feed status table |
| Clients | requests per client, and how a client is identified |
| Traffic | requests per endpoint, response codes, and recent activity |

**The overview tiles are the navigation.** Each tile is a button that opens
the section explaining it — "unique clients" opens the client breakdown,
"feed polls" opens the feed breakdown — so a reader who wants the detail
behind a number clicks the number rather than hunting for the right tab.

### The activity pulse

A line chart of requests and errors over the window, bucketed into 48 points
in SQL rather than by reading rows and counting them in JavaScript — after a
load test the table holds tens of thousands of rows for a single window.

Two series, so a legend is always present and identity never rests on colour
alone. Errors use the reserved status colour rather than a third categorical
hue, because "this is the bad one" is the whole point of plotting it. The two
colours were checked with a palette validator against both theme surfaces
rather than picked by eye — colourblind separation ΔE 23.5 in dark and 29.8 in
light, against a target of 8.

Hovering gives a crosshair that snaps to the nearest bucket and one tooltip
listing every series, so the pointer never has to land on a 2px line. Every
value the tooltip shows is also in a table rendered for screen readers, so
the interaction enhances and never gates.

**Alerts have two levels.** A warning says something is drifting — error rate
above 2%, a channel that served zero items, a request past one second. A
critical says someone has to act — the database is unreachable, or errors are
above 10%. A single threshold only ever tells you once it is already too late.

### Tracing

`instrumentation.ts` at the project root registers the OpenTelemetry Node SDK.
**It must be at the root** — Next only looks for it there, and a copy under
`app/` silently exports nothing.

Next instruments its own request handling, so every request already produces a
root span. What it cannot know is what this application is doing, so the spans
that matter are added by hand in `lib/otel.ts`:

| Span | Where | Answers |
| --- | --- | --- |
| `api <METHOD> <route>` | `handle()` | which handler ran, and how long it took |
| `rss.lookup_channel` | `/rss/[slug]` | was the channel resolution slow |
| `rss.load_items` | both RSS routes | was the item query slow |
| `dashboard.aggregate` | `lib/dashboard.ts` | which dashboard query is expensive |

A slow feed then shows *which part* was slow, rather than only that it was.

### Metrics

`/api/metrics` exposes `rss_requests_total`, `rss_request_duration_ms`,
`rss_feed_polls_total`, `rss_feed_items` and `rss_unique_clients`, plus Node
process metrics. Route labels collapse `/rss/careers` to `/rss/[slug]`: a
label per channel or per post id is unbounded cardinality, which is the usual
way a Prometheus instance is brought down.

Per-client breakdowns are deliberately **not** Prometheus labels — those come
from the database, where a high-cardinality dimension belongs.

---

## Testing

| Tool | What it covers | Where |
| --- | --- | --- |
| Playwright | 10 end-to-end tests, server and client use cases | `e2e/` |
| JMeter | staged load, x1 → x10000 | `load/` |
| Lighthouse | accessibility and performance, before and after | `docs/lighthouse/` |

```bash
npx playwright test           # starts its own production build
./load/run-stages.sh          # needs a server on :3100 and JMeter installed
```

The end-to-end tests drive the real interface and then check the API **and the
published RSS** agree with it — a UI test that asserts only on the UI can pass
while the feed it is supposed to publish stays empty. One test polls a feed
and then asserts the dashboard's count moved, which checks the dashboard's
central claim end to end.

Load testing found that nothing degrades until roughly two thousand concurrent
clients, where latency rises about twentyfold while throughput also rises and
no request fails — queueing rather than breakage, most likely SQLite
serialising the `RequestLog` write. Full analysis, including an honest account
of why the x10000 stage is 10,000 sessions rather than 10,000 concurrent
threads, is in [`load/README.md`](load/README.md).

The accessibility review is in [`docs/accessibility.md`](docs/accessibility.md).
Its headline: all four pages scored **100 for accessibility before any change
was made, and all four still had a real defect** — a Lighthouse score is a
floor, not a verdict.

Deployment to EC2 is documented in [`docs/deployment.md`](docs/deployment.md).

---

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite location. `file:/data/rss.db` in Docker. |
| `SITE_URL` | derived from the request | Absolute base for links inside the RSS feed. |
| `NEXT_PUBLIC_API_BASE` | `""` (same origin) | Lets the client target a different server. |
| `BUILD_TARGET` | unset | `static` builds the Assessment 1 GitHub Pages export. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Collector address. `http://otel-collector:4318` in Compose. |
| `OTEL_SERVICE_NAME` | `rss-server` | Name shown in Jaeger's service list. |

---

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 with the
better-sqlite3 driver adapter · SQLite · Zod · Docker · OpenTelemetry ·
Jaeger · Prometheus · Playwright · JMeter

---

## Project continuity

Assessment 1 established the frontend, usability and accessibility layer.
Assessment 2 added the API, database and Docker packaging, and started
collecting operational data it did not yet display — `RequestLog`,
`Subscriber` and `/api/stats` were built there in anticipation of this stage.

Assessment 3 makes the running system observable and proves it works:
`/dashboard` reads the data that was already being collected, `RequestLog`
grew the two columns it turned out to be missing, `FeedFetch` records what the
feeds themselves do, OpenTelemetry and Prometheus report on the system from
the outside, and Playwright, JMeter and Lighthouse establish that it behaves
under use.

Assessment 4 presents this system live.
