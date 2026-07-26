# Verbal justification outline (scored 10%)

Use this as a speaking script inside the 3–8 minute submission video. Aim for ~1,200 words equivalent across the walkthrough + explanation.

## 1. Open with identity (30s)

- Show student ID on camera; introduce name and student number.
- State: Assessment 1 frontend for an RSS Server feeding an LMS; no live backend yet.

## 2. Demo the interface (2–3 min)

- Home: purpose of the RSS→LMS workflow (announcements without email overload).
- Hamburger on a narrow window: CSS transform animation, About/Settings links.
- Feeds list: dates, summaries, read more → dynamic detail route.
- Create local item → appears in list (localStorage stand-in for RSS).
- Hide/show: collapsible panels + Settings compact mode.
- Theme toggle: switch light/dark, reload to prove cookie persistence.
- Breadcrumbs on Feeds / detail / Settings.

## 3. Design decisions

- **Lines over cards** from personal design system (`design.md`) — scanning feed rows with dividers suits announcement lists better than filled card chrome.
- **Alliance fonts** for a quiet technical voice; uppercase micro-labels for metadata.
- **Component split**: Header/Footer/Nav, ThemeProvider, FeedList/Form/Detail, Collapsible — reusable for Assessment 2 when data source changes.
- **RSS-shaped model**: `title`, `pubDate`, `summary`, `content`, `author`, `source` so A2 can map XML fields without rewriting the UI.

## 4. Usability / accessibility

- Clear primary nav + compact hamburger; skip link; keyboard Escape closes menu.
- Focus-visible and hover states on links/buttons (cyan border + soft glow).
- Contrast considered in both themes; muted labels only for secondary text.
- Compact mode supports quick scanning of many feed items.

## 5. Trade-offs

- Cookie for theme (small preference, taught in Module 2) vs localStorage for feed drafts (larger structured data).
- Local sample data vs real RSS — deliberate A1 scope so UX can be marked before server work.
- Dark-first design system adapted to a light theme for the rubric instead of shipping dark-only.
- No carousel — lecturer indicated it is not required; effort went to hamburger, themes, and feeds.

## 6. Project continuity (A2)

- Next step: API/RSS ingest + server, swap `lib/feeds` persistence for live feed URLs.
- UI already models the LMS client surface: list → detail → preferences.

## 7. Close

- Point to GitHub repo, feature branches, and README.
- Mention AI acknowledgement completed; invite marker questions on theme/cookie code path.
