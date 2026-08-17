# Submission checklist

## Assessment 3

- [ ] **Video, 3–8 minutes**, showing student ID, face and voice — script in
      `VIDEO_SCRIPT.md` (kept locally, deliberately not committed)
- [ ] **Zip of the project code**, with `node_modules` removed:

```bash
cd ..
zip -r latrobe-rss-a3-22840097.zip latrobe_cloud_assessment_1 \
  -x '*/node_modules/*' '*/.next/*' '*/.git/*' '*/out/*' \
     '*/test-results/*' '*/playwright-report/*' '*/assessment_3/*'
# confirm nothing slipped through
unzip -l latrobe-rss-a3-22840097.zip | grep -c node_modules   # expect 0
```

- [ ] **GitHub repository link:**
      <https://github.com/nickgreengithub/latrobe-cloud-assessment-3>
- [ ] **AI acknowledgement form** — required, and its absence can be treated as
      an academic integrity breach. The form is on the Assessments page in
      Moodle. This assessment permits full AI use, so there is nothing to
      declare beyond completing it honestly.
- [ ] Submitted via Moodle so it **generates a Turnitin similarity score** —
      a submission that produces no score cannot be checked and will not be
      marked.

## Assessment 4 — the live defence

- [ ] **Book a slot** as soon as the spreadsheet is announced. Slots are about
      ten minutes and the whole cohort is marked in one week.
- [ ] **Start EC2 and the stack at least ten minutes before the slot.** Cold
      boot plus image pull plus the first Next.js request takes longer than a
      slot allows. See [`deployment.md`](deployment.md).
- [ ] Generate traffic before the session so the dashboard has data.
- [ ] No slides. It is a live demonstration and questions.
- [ ] Keep the Assessment 3 video accessible as a fallback if the deployment
      fails on the day.

### Questions to have an answer ready for

These are the ones signalled in class, and the ones this codebase invites:

- **"Show me the data is really in the database."**
  `docker compose exec rss-server sh -c 'sqlite3 /data/rss.db "select feedSlug, count(*) from RequestLog group by feedSlug;"'`
- **"How do you know the application is healthy?"** `/api/health` does a real
  `SELECT 1`; `docker compose ps` shows the container healthcheck polling it;
  the dashboard health strip shows both.
- **"Where are your spans?"** `lib/otel.ts` defines `withSpan`; `handle()` in
  `lib/api-response.ts` names one per API route; the RSS routes wrap the
  channel lookup and the item query separately. Show one in Jaeger.
- **"What happens if I post an empty feed URL?"** Zod rejects it with 422
  before it reaches the database — there is an end-to-end test for exactly
  this in `e2e/server.spec.ts`.
- **"What breaks first under load?"** SQLite serialises the `RequestLog`
  write. See `load/README.md`.
- **"Why SQLite and not Postgres?"** One process, no start-up ordering to get
  wrong, data on a named volume. The load results quantify what that choice
  costs and where it would need to change.
- **"Why is `instrumentation.ts` at the root?"** Next only looks for it there.
  Under `app/` it silently exports nothing and the service never appears in
  Jaeger.

## Known gaps, stated honestly

- The x10000 load stage is 10,000 client sessions at 2,000 concurrency, not
  10,000 concurrent clients. The machine generating the load could not create
  more than ~4,100 OS threads. Explained in `load/README.md`.
- `npm audit` reports advisories in `sharp`, a transitive dependency of the
  pinned Next.js version. Clearing them requires a Next upgrade, which was not
  worth the regression risk mid-assessment.
- Lighthouse performance sits at 91 on `/feeds`; the remaining opportunities
  are in the framework bundle rather than in application code.
