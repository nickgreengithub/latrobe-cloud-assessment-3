# Assessment 3 — video walkthrough script

**Required:** 3–8 minutes, showing your **student ID card, your face and your
voice**, plus the application and its key features. Aim for **7 minutes** —
there is a lot to show and the marking is done alongside the live defence, so
this is the artefact that has to stand on its own if anything goes wrong.

---

## Before you press record

- [ ] `docker compose up -d --build` — all four services `Up`
- [ ] Generate traffic so the dashboard is not empty:
      `HOST=127.0.0.1 PORT=3000 ./load/run-stages.sh` (or a few dozen curls)
- [ ] Tabs open, in this order: `/dashboard` · `/feeds` · `/client` ·
      Jaeger `:16686` · Prometheus `:9090` · GitHub repo · terminal
- [ ] Student ID card within reach
- [ ] Terminal font large enough to read on a compressed recording
- [ ] Notifications off, other tabs closed

---

## 0:00 — Identity (20s)

> "Nicholas Green, student number 22840097, CSE5006 Assessment 3 — a
> data-driven web application and reporting."

Hold the student ID to camera. Face visible. Say the numbers aloud rather than
only showing them.

## 0:20 — What the system is (40s)

One sentence of continuity, then move:

> "This is an RSS server for university announcements. Assessment 1 built the
> interface, Assessment 2 built the API, database and Docker packaging.
> Assessment 3 is about knowing whether the thing is actually working — so
> it's a dashboard, tracing, metrics, and three kinds of testing."

Show the architecture diagram in the README briefly. Do not read it out.

## 1:00 — The dashboard (2:00) ← **the largest single mark, spend the time**

Open `/dashboard`. Work top to bottom and say what each thing is *for*:

- **Health strip** — "`/health` returns 200, and this database figure is a
  real `SELECT 1`, not an assumption. The container's own healthcheck polls
  the same endpoint."
- **Alerts** — "These are rules over the data, with two levels. A warning
  means something is drifting; a critical means someone has to act. One
  threshold only tells you once it's already too late." Point at a live
  warning — the unknown-channel one is good: "someone's client is polling a
  channel that doesn't exist, which is invisible unless something says so."
- **Operational metrics** — total requests, requests in window, **unique
  clients**, feed polls, items served, RSS channel count, latency, error rate.
  Name them; these are the rubric's list.
- **Requests per feed** — "measured per channel, not inferred from the path."
- **Feed status table** — "posts stored, polls received, items in the last
  delivery, and its state. A feed serving zero items is a 200 as far as HTTP
  is concerned — that's why there's a separate table recording what the feed
  did, not just what the response code was."
- **Requests per client** — "identified by a hash of address and user agent,
  so the count is real without the server storing who anyone is."

**Then make it move.** In the terminal, `curl http://localhost:3000/rss` a few
times, and watch the counters change on the next refresh. This is the single
most convincing ten seconds in the video — it proves the numbers are live
rather than rendered once.

## 3:00 — Data and persistence (1:00)

> "All of that comes out of the database, through Prisma."

- Show `prisma/schema.prisma` — point at `RequestLog` (with `feedSlug` and
  `clientKey`) and `FeedFetch`.
- **Prove it from the database, not the UI** — expect this question in the
  oral defence:

```bash
docker compose exec rss-server sh -c \
  'sqlite3 /data/rss.db "select feedSlug, count(*) from RequestLog group by feedSlug;"'
```

> "Same numbers the dashboard is showing, straight out of SQLite."

## 4:00 — Tracing and metrics (1:00)

- **Jaeger** `:16686` → service `rss-server` → find a trace → expand it.
  > "Next instruments its own request handling automatically. These
  > — `rss.lookup_channel`, `rss.load_items` — are spans I added by hand, so
  > when a feed is slow I can see whether it was the database or the render."
- **Prometheus** `:9090` → query `rss_feed_polls_total` → Graph.
  > "Per channel, over time. The app exports OTLP to a collector and the
  > collector decides where it goes — swapping Jaeger out doesn't touch
  > application code."
- Show `/targets` — all three up.

## 5:00 — Testing (1:15)

- **Playwright** — run it live if you are confident, or show a recorded pass:
  ```bash
  npx playwright test
  ```
  > "Ten tests. The server use case creates an announcement through the real
  > form, then checks the API *and the published RSS* agree — a UI test that
  > only checks the UI can pass while the feed stays empty. The client use
  > case fetches and renders a feed. One test polls a feed and then asserts
  > the dashboard's count moved."
- **JMeter** — show `load/results/summary.md`:
  > "x1 through x1000, nothing moves — 3 or 4 milliseconds. At two thousand
  > concurrent clients the mean goes to 58 and the p99 to 149, but throughput
  > goes *up* and nothing fails. That's queueing, not breaking, and it's
  > SQLite serialising the request-log write."
  > "The x10000 stage is 10,000 sessions at 2,000 concurrency, because my
  > machine won't create more than about 4,100 OS threads. That's the load
  > generator hitting a limit, not the server — the server never failed a
  > request."
  Being upfront about this reads as competence, not as a shortfall.
- **Lighthouse** — open a before and after report side by side:
  > "Accessibility scored 100 on every page before I changed anything — and
  > every page was still failing the label/name mismatch check, because that
  > audit doesn't carry any score weight. The header link announced 'Home'
  > while the screen said something else, so anyone using voice control
  > couldn't activate it by reading it. Fixed by letting the visible text be
  > the accessible name. A Lighthouse score is a floor, not a verdict."

## 6:15 — Repository and CI (30s)

- GitHub: show the **branch list and the merged pull requests** — one branch
  per feature, clean `main`, no `node_modules`.
- Show `.github/workflows/ci.yml`:
  > "Every pull request lints, type checks, builds, runs the end-to-end tests
  > and builds the container image before it can merge. Main is gated, not
  > trusted."

## 6:45 — Close (15s)

> "That's the RSS server with a data-driven dashboard, OpenTelemetry tracing,
> Prometheus metrics, and Playwright, JMeter and Lighthouse testing. Running
> in Docker, deployed on EC2. Thanks."

---

## If something breaks on camera

Keep recording and narrate it. "That's a 500 — let me look at the logs" and
then finding it is worth more than a clean take, and this same system has to
survive live questioning in Assessment 4 anyway.

## Things not to do

- Don't read the README aloud. Show the running system.
- Don't skip the "make the counters move" moment to save time — cut something
  else.
- Don't claim 10,000 concurrent clients. Say what actually happened.
- Don't spend more than a minute on Assessment 1 and 2 material.
