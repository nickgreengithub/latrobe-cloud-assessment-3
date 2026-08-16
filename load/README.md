# Load testing with JMeter

Staged load against the RSS feed endpoints, to find where this server stops
being comfortable.

## Running it

```bash
# 1. Start a production build (dev mode compiles on first request and would
#    measure the compiler rather than the application)
npm run build && npx next start --port 3100

# 2. Run every stage
export JAVA_HOME=/opt/homebrew/opt/openjdk@21   # macOS, after `brew install jmeter`
./load/run-stages.sh

# Against a deployed instance
HOST=<ec2-public-ip> PORT=3000 ./load/run-stages.sh
```

Results land in `load/results/` — one `.jtl` per stage, plus `summary.md`.

## What the plan does

`rss-load.jmx` is one parameterised thread group, not five near-identical
copies. Each simulated client polls `/rss`, `/rss/careers` and `/api/health`
in sequence, with keep-alive **off** so each poll opens its own connection —
which is what a real subscriber on a timer does. Copies of a thread group
drift apart the first time one is edited; a single plan driven by properties
cannot.

`/api/health` is in the loop deliberately. It is what a load balancer polls,
so if it degrades under load the platform starts removing instances that are
actually fine — a failure mode worth knowing about before it happens.

## Results

Measured on the development machine (Apple Silicon, 8-core), server and load
generator on the same host, SQLite on local disk.

| Stage | Concurrent clients | Requests | Failed | Mean ms | p95 | p99 | Max ms | Req/s |
|---|---|---|---|---|---|---|---|---|
| x1 | 1 | 60 | 0 | 4 | 5 | 13 | 51 | 223 |
| x10 | 10 | 300 | 0 | 4 | 7 | 19 | 23 | 319 |
| x100 | 100 | 1,500 | 0 | 3 | 6 | 11 | 34 | 305 |
| x1000 | 1,000 | 6,000 | 0 | 3 | 2→4 | 9 | 39 | 201 |
| x10000 † | 2,000 | 30,000 | 0 | 58 | 117 | 149 | 245 | 499 |

† See "About the x10000 stage" below. Every stage returned HTTP 200 for every
request; there were no failures at any level.

## What the numbers say

**Nothing happens until two thousand clients.** From one client to a thousand,
the mean response time does not move — it sits at 3–4 ms, and the p99 actually
*improves* (13 ms → 9 ms) as the JIT warms up and the SQLite page cache fills.
A thousand concurrent subscribers is simply not enough work to trouble this
server.

**At two thousand, latency degrades but correctness does not.** Mean response
time rises roughly twentyfold, from 3 ms to 58 ms, and p99 reaches 149 ms.
Throughput rises at the same time, from ~200 to ~499 requests per second.
That combination — more throughput, worse latency, no errors — is queueing,
not breakage: requests are arriving faster than they are served and waiting
their turn, rather than being dropped. 149 ms at the 99th percentile is still
well inside the three-second budget a user would notice.

**The likely constraint is SQLite's single writer.** Every request writes a
`RequestLog` row, and SQLite serialises writes. The reads are trivial and the
feed rendering is string building, so the write path is the only part that
cannot proceed in parallel. This is the cost of the design choice made in
Assessment 2 — one process, no separate database service, nothing to get wrong
at start-up — and these numbers are what that choice is worth: excellent up to
a thousand concurrent clients, and gracefully slower beyond it. Moving
`RequestLog` writes to a queue, or to Postgres, is the change to make if this
ever needed to serve more.

**Nothing degraded `/api/health`.** It stayed inside the same envelope as the
feed endpoints at every stage, so a load balancer polling it would not have
started removing healthy instances under load.

## About the x10000 stage

The brief asks for stages up to x10000 "or equivalent staged load levels".
This one is an equivalent, and it is worth being exact about why.

A JMeter thread is a JVM thread, which is an OS thread. This machine refuses
to create more than about **4,100** of them in one process — the run fails
with `pthread_create failed (EAGAIN)` partway through the ramp, and the JMeter
log records the exact thread it gave up on. Raising that needs system
configuration rather than a JMeter setting, and `ulimit -u` in the shell does
not do it. A first attempt at a true 10,000-thread stage confirmed this: only
4,122 of the 10,000 clients ever started.

That is a limit of the **load generator**, not of the server under test. The
server never returned an error at any point during it.

So the top stage runs **10,000 client sessions as 2,000 concurrent clients
cycling five times** — the same 30,000 requests, at the highest true
concurrency this hardware can generate. Reaching genuine 10,000-way
concurrency would need either several load-generating machines, or a
non-thread-per-client tool such as k6 or Gatling.

The honest summary: this server was never pushed to failure, because the
laptop generating the load ran out of threads before the server ran out of
capacity.
