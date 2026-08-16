# Accessibility and performance review

Lighthouse was run against four pages — home, `/feeds`, `/client` and
`/dashboard` — before and after the changes below. The full reports are in
`docs/lighthouse/` as `before-*.report.html` and `after-*.report.html`.

## Scores

| Page | Accessibility | Performance before | Performance after |
|---|---|---|---|
| Home | 100 → 100 | 89 | **96** |
| `/feeds` | 100 → 100 | 91 | 91 |
| `/client` | 100 → 100 | 92 | **94** |
| `/dashboard` | 100 → 100 | 94 | **97** |

Best practices and SEO were 100 on every page both times.

## The accessibility score was already 100, and the pages still had a defect

This is the important finding, and it is worth stating plainly: **a
Lighthouse accessibility score of 100 does not mean a page is accessible.**

Every page scored 100 before any change was made. Every page was also failing
the `label-content-name-mismatch` audit. Both things were true at once,
because that audit carries no weight in the score — it is reported, but it
does not subtract from 100. Reading only the number would have found nothing
to fix.

### What was wrong

An element's *accessible name* — what a screen reader announces, and what
voice-control software listens for — did not contain its *visible text*.

**1. The site title in the header.** The link carried `aria-label="Home"`
while displaying "Assessment 3 — Data-driven Web Application". A screen
reader announced "Home"; the screen said something else entirely. Worse, a
person driving the browser by voice could not activate it, because saying the
words they could see matched nothing.

*Fixed* by removing the `aria-label` so the visible text becomes the
accessible name. The two can no longer disagree, because they are now the
same thing.

**2. Every row in the post list.** Each row is a button labelled
`aria-label="<title> — <category>"`, but the row visibly contains the
category, date, author, title *and* summary. The label was a subset of what
was on screen, which fails the same rule for the same reason.

*Fixed* by removing the `aria-label` and letting the row's own content name
it. A screen reader now reads more per row, which is a real cost — but it
reads what is actually there, and voice selection works.

Both fixes are verified: `label-content-name-mismatch` reports no violations
on any of the four pages afterwards.

## Manual review, beyond the automated audit

Automated tools check what can be checked mechanically. These were checked by
hand while building the dashboard.

- **Keyboard.** Every control on `/dashboard` — the four window buttons and
  the live/paused toggle — is a real `<button>`, reachable by Tab and
  operable by Enter and Space. The window picker is a `role="group"` with an
  accessible name, and each option carries `aria-pressed`, so a screen reader
  announces which window is selected rather than only that a button exists.
- **The metric bars are decorative.** Each bar sits beside a number that
  already states its value, so the bar itself is `aria-hidden`. Announcing
  the same figure twice is noise, not information.
- **The feed status table is a real table** with `<caption>`, `<th scope>` on
  both axes and no layout-only cells, so it can be navigated cell by cell
  with a screen reader's table commands.
- **Status is never colour alone.** Every state pill and status chip carries
  a word — `serving`, `idle`, `empty`, `error`, and the HTTP code itself —
  so the meaning survives for anyone who cannot distinguish the colours.
- **Reduced motion is respected.** The live indicator's pulse and the bar
  width transitions are both disabled under
  `prefers-reduced-motion: reduce`. They are decoration; the numbers beside
  them carry the information.
- **Contrast.** The `--ok` and `--warn` tokens added for the dashboard were
  chosen against the panel background in both themes. The first, more
  saturated pair failed contrast in light mode and was replaced with the
  darker `#15803d` / `#b45309`.
- **The dashboard is readable without JavaScript running.** The first
  snapshot is rendered on the server; polling is an enhancement on top.

## Performance changes

**The home page image was oversized.** `noticeboard.jpg` was 900×900 at
306 KB, displayed in a 370×370 slot. It is now 740×740 at 194 KB — enough for
a 2× display and nothing beyond it. Home went from 89 to 96, and largest
contentful paint improved correspondingly.

The dashboard's improvement (94 → 97) came from the same rebuild plus its
server-rendered first snapshot: the page arrives with its numbers already in
it rather than painting empty and then filling in.

**What was left alone.** The remaining opportunities are `unused-javascript`
and `legacy-javascript` from the Next.js framework bundle itself, worth
roughly 400–500 ms. Addressing them means changing how the framework builds,
which is not a change worth making to a working application for a few points
of a synthetic score. `/feeds` stayed at 91 for the same reason — it is a
client-rendered list, and its cost is the framework, not the page.

The whole application loads well inside three seconds, which is the threshold
that actually matters to whether someone stays.
