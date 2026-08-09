# Assessment 2 — video script

**Target: 6 minutes** (brief allows 3–8). Bracketed lines are actions, not narration.

---

## Pre-flight — do this before you hit record

```bash
cd ~/development/latrobe_cloud_assessment_1
docker compose down          # optional: a fresh start looks better on camera
docker compose up -d --build
docker ps                    # wait until STATUS says (healthy)
```

Then set the stage:

- **Settings page → turn OFF "compact list"** so post summaries are visible.
- Open browser tabs in this order, left to right:
  1. `localhost:3000` 2. `localhost:3000/feeds` 3. `localhost:3000/client`
  4. `localhost:3000/rss` 5. `localhost:3000/api/health` 6. `localhost:3000/api/stats`
- Have a terminal window ready, font size **16pt+** so it reads on video.
- Open `prisma/schema.prisma` in your editor.
- Have your student ID card in reach.

Have this command copied ready to paste:

```bash
curl -X POST http://localhost:3000/api/posts -H 'Content-Type: application/json' \
  -d '{"title":"Live demo post","summary":"Created on camera.","content":"Written to SQLite and published as RSS.","authorName":"Careers & Employability","feedSlugs":["careers"]}'
```

---

## 0:00 — Identity (30s)

> [**Face to camera, holding student ID up**]
>
> "Hi, I'm Nicholas Green, student number 22840097, and this is my Assessment 2
> submission for Cloud Web Applications.
>
> Assessment 1 was the frontend. Assessment 2 puts a real server behind it — a
> database, a REST API, RSS output, and the whole thing running in Docker. I'll
> show you the server sending feeds to a client, and then how it works underneath."

---

## 0:30 — It runs in Docker (45s)

> [**Switch to terminal. Type `docker ps`**]
>
> "The application is running in a Docker container right now. You can see the
> status here reads **healthy** — that's not Docker just checking the process is
> alive. It's polling my own healthcheck endpoint every fifteen seconds."

> [**Type `docker compose logs --tail 20 rss-server`**]
>
> "And on start-up the container applies its database migrations and seeds the
> baseline channels before the server boots. So `docker compose up` on a clean
> machine gives you a working server — there's no manual setup step."

---

## 1:15 — The heartbeat and the database probe (45s)

> [**Browser tab: `localhost:3000/api/health`**]
>
> "This is the healthcheck Docker is polling. Notice it's not just returning
> 'ok'. It runs an actual `SELECT 1` against the database and reports the
> latency — seven milliseconds here. If the database were unreachable this
> returns a 503 and the container gets marked unhealthy. A healthcheck that
> returns 200 no matter what tells an operator nothing."

---

## 2:00 — The schema (60s)

> [**Editor: `prisma/schema.prisma` — in VS Code, `Cmd+P` then type `schema.prisma`.
> Scroll slowly through the models.**]
>
> "The database is SQLite through Prisma. Seven models, and each one earns its
> place in the RSS use case.
>
> `Feed` is a channel — and deliberately, the channel *is* the category.
> `/rss/careers` **is** the Careers feed, so a separate category table would
> have been duplication.
>
> `Post` is an RSS item. `Author` is the poster.
>
> [**Point at `FeedPost`**] This is an explicit many-to-many join rather than an
> implicit one, so it can carry its own data — and it means one post can go to
> several channels. An internship notice is both Careers and General.
>
> [**Point at `onDelete: SetNull` on the author relation**] The delete rules are
> deliberate too. Removing an author sets null rather than cascading — deleting
> a person shouldn't destroy everything they published. But enclosures and join
> rows *do* cascade, so nothing is orphaned.
>
> [**Point at `@@index([status, pubDate])`**] And that composite index is
> precisely the query that renders a feed."

**Optional — show the real rows** (a stronger shot than Prisma Studio, because it
reads the live database inside the running container):

```bash
docker exec rss-server node --experimental-sqlite -e "
const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('/data/rss.db');
for (const t of ['Feed','Post','Author','FeedPost','Enclosure','Subscriber','RequestLog'])
  console.log(t.padEnd(12), db.prepare('SELECT COUNT(*) c FROM '+t).get().c);
"
```

> "And those models aren't theoretical — here are the actual row counts from the
> database inside the container. Five channels, three posts, and four rows in
> the join table, because one post belongs to two channels."

> **Do NOT run `npm run db:studio` on camera.** It reads `DATABASE_URL` from
> `.env`, which points at the local `./dev.db` — a *different* database from the
> container's `/data/rss.db`. They look almost identical, so the mistake is easy
> to miss, but a post you create on camera will not appear in Studio. If you
> want the Studio GUI, snapshot the live database first:
>
> ```bash
> docker cp rss-server:/data/rss.db /tmp/live.db
> DATABASE_URL="file:/tmp/live.db" npx prisma studio   # opens localhost:5555
> ```

---

## 3:00 — CRUD over the API (60s)

> [**Terminal. Paste the prepared POST command, hit enter.**]
>
> "Here's a create through the REST API. It comes back **201** with the full
> record — you can see it's been given an ID, a GUID, and it's been attached to
> the Careers channel."

> [**Type `curl -s localhost:3000/api/posts | head -c 400`**]
>
> "Every endpoint returns the same envelope — `ok`, `data`, `meta`, `error` — so
> the frontend never has to guess the shape of a response. The `meta` block
> carries the paging totals."

> [**Type: `curl -s -X POST localhost:3000/api/posts -H 'Content-Type: application/json' -d '{"title":"x"}' -o /dev/null -w "%{http_code}\n"`**]
>
> "And the status codes are meaningful — that's a **422**, validation failure.
> Missing record gives 404, duplicate slug gives 409."

---

## 4:00 — The money shot: server → client (75s)

> [**Browser tab: `localhost:3000/rss`**]
>
> "This is the RSS server output. Valid RSS 2.0 — channel metadata, and one item
> per announcement. The dates are RFC-822 format, which the spec requires, and
> the text is CDATA-wrapped so ampersands and smart quotes can't break the XML."

> [**Browser tab: `localhost:3000/client`**]
>
> "And this is the RSS Client. This page is a *subscriber* — it's not reading
> the database. It makes an HTTP request to `/rss`, gets XML back, and parses it
> with DOMParser exactly like any third-party feed reader would.
>
> You can see the transport details up here — 200, the round-trip time, the
> payload size."

> [**Click `/rss/careers`, then `/rss/events`**]
>
> "And subscribing to a different category just means pointing the client at a
> different endpoint. Careers. Events. Same client, different URL — that's the
> whole story. Nothing else changes."

> [**Click "Raw RSS 2.0 response" → Show**]
>
> "And here's the raw XML it received, so you can see this is genuinely RSS
> crossing the network, not an internal function call dressed up as one."

---

## 5:15 — Frontend integration and operational output (45s)

> [**Browser tab: `localhost:3000/feeds` — refresh**]
>
> "The Assessment 1 interface is intact — same components, same themes, same
> hamburger menu. What changed is where the data comes from. The local storage
> layer is deleted; this list is the database, read through the API. There's the
> post I created in the terminal a minute ago.
>
> Searching and filtering are pushed down to the server as query parameters, not
> filtering a local copy."

> [**Browser tab: `localhost:3000/api/stats`**]
>
> "And there's a second operational endpoint — posts per channel, per author,
> and subscriber polling. Alongside `/api/count`, which reports request totals
> and timings from a log the API writes on every call."

---

## 6:00 — Persistence and repository (45s)

> [**Terminal: `docker compose down && docker compose up -d`, wait, then refresh `/feeds`**]
>
> "One last thing — the database lives on a named Docker volume, not inside the
> container. So I can destroy and recreate the container, and the post I created
> is still there."

> [**Browser: your GitHub repo → Pull requests → Closed**]
>
> "And the repository has each feature on its own branch, merged through pull
> requests, with CI that lints, type-checks and builds the container image on
> every push.
>
> That's Assessment 2 — thanks for watching."

---

## Timing check

| Section | Runs | Cumulative |
| --- | --- | --- |
| Identity | 0:30 | 0:30 |
| Docker | 0:45 | 1:15 |
| Healthcheck | 0:45 | 2:00 |
| Schema | 1:00 | 3:00 |
| CRUD | 1:00 | 4:00 |
| **Server → Client** | 1:15 | 5:15 |
| Integration + stats | 0:45 | 6:00 |
| Persistence + repo | 0:45 | 6:45 |

Comfortably inside the 3–8 minute window with room to breathe.

---

## If you run short on time

Cut in this order: the schema walk-through to 30 seconds, then the persistence
demo, then `/api/stats`.

**Never cut:** your ID and face, `docker ps` showing healthy, and the
`/client` page switching channels. Those three cover the criteria the rubric
names explicitly.

---

## Common on-camera failures

- **Nothing loads.** Another container may have taken port 3000 — `docker ps`
  and check. `markovcast-frontend` was the culprit before.
- **`/client` shows an error.** The container is still starting; wait for
  `docker ps` to say healthy.
- **Stale content in the browser.** Hard reload with `Cmd+Shift+R`.
- **Summaries missing from post rows.** Compact list is on in Settings.
