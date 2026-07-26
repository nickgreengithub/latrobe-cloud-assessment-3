# Assessment 1 — Video Talking Points

**Student:** Nicholas Green · **ID:** 22840097
**Project:** Frontend for an RSS Server that feeds subject announcements into an LMS.
**Scope:** Assessment 1 is *frontend design & usability only* — sample/local data stands in for live RSS, which arrives in Assessment 2.

> Two things the rubric rewards in the video: (1) a clear **how-to-use** walkthrough, and (2) an **insightful justification** of design decisions, usability, trade-offs, and project continuity. This script covers both. Aim for ~4–6 minutes. Speak to the points, don't read them verbatim.

---

## 0. Opening (~20s)
- "Hi, I'm Nicholas Green, student 22840097. This is my Assessment 1 submission — the frontend for an RSS-fed LMS announcement stream."
- The problem it solves: subject announcements are scattered across crowded email inboxes. This UI pulls them into **one announcement stream** — and in Assessment 2 a server will publish them as live RSS.
- "Assessment 1 is frontend and usability only, so I'm using sample content stored locally."

---

## 1. How to use the site — walkthrough (~2 min)

**Home**
- Landing page orients the user: a large **Feeds/Posts** card as the primary action, with **About** and **Settings** below.
- The illustration is a deliberate placeholder for feed media (more on that under design choices).
- Click **Open feed**.

**Feeds / Posts** (the core screen)
- List of sample announcements. Point out each card: **image slot**, date, author/source, title, summary.
- **Search** — type to filter the list live; the "N of M" counter updates.
- **New** — opens a **dialog** to add an item (demo this: type a title/summary/content → Publish → it appears at the top instantly).
- Click a card to open its **detail page** — this is a **dynamic route** (`/feeds/[id]`).

**Detail page**
- Hero image slot, metadata (date/author/source), the full article, and an inline **breadcrumb** (Feeds / Item) plus **Back** and **Delete** actions.

**About**
- Student details, project scope, a slot for this how-to video, and a **References** section that **hides/shows** (collapsible).

**Settings**
- **Theme** toggle (light/dark) — flip it and note the whole app updates instantly.
- **Compact feed list** — turn it on, return to Feeds, show the denser layout.
- **Reset sample feeds** restores the seed data.

**Responsive + navigation**
- Shrink the window (or show on mobile): the nav collapses into a **hamburger menu** with an animated open/close, and layouts reflow to a single column.

---

## 2. Design choices & justification (~2–3 min)

**Structure & consistency**
- Four clear sections — Home, Feeds/Posts, About, Settings — mirrored in the top nav, so location is always obvious.
- I removed redundant page headings because the nav already names each page; every view uses the **same slim header band** (a location pill on the left, a caption on the right). Because the header height is fixed, the main container **starts at the same vertical position on every tab** — less cognitive load when switching.
- Containers fill the height down to a consistent gap above the footer.

**Visual system**
- Type is the **Alliance** family (the required font). I paired it with a slate base and an indigo→cyan **gradient accent**, soft shadows, and rounded cards for a modern, cohesive look.
- Interaction polish uses **CSS transforms**: cards lift on hover, the icon nudges, the toggle knob slides, and views fade/slide in on load.

**Themes & persistence**
- Light and dark modes share the same tokens. The theme is saved in a **cookie** and applied by a tiny boot script *before* paint, so there's no flash on reload. The compact-list preference persists in **localStorage**. Both survive refresh and apply across every page.

**Interactivity & sample/local data**
- Feeds are seeded into **localStorage** and fully CRUD-able locally (create via the dialog, delete on the detail page) — a realistic stand-in for the RSS items A2 will ingest.
- Navigation aids: **dynamic detail routes**, an inline **breadcrumb**, active-state nav highlighting, and the **hide/show** References panel.

**Accessibility (WCAG-informed)**
- Semantic landmarks (`header`/`main`/`nav`/`footer`), a **skip-to-content** link, and a visually-hidden `<h1>` on each page so the heading outline stays intact even though titles aren't shown.
- The New-item dialog uses the **native `<dialog>` element**, so focus-trapping, Escape-to-close, and an inert background come from the platform; focus lands on the first field, and returns cleanly on close.
- Visible focus outlines, `aria-current` on the active tab, labelled icon buttons, and a **`prefers-reduced-motion`** fallback that disables animations.

**Image placeholders — a deliberate trade-off**
- Every feed reserves an **image slot**. Until the RSS server supplies media in A2, I render a **deterministic gradient placeholder** (stable per item, and computed without randomness so server and client render identically). The code already prefers a real image when an `imageUrl` is present — so nothing changes when live media arrives.

**Code quality & modularity**
- Reusable components: `FeedThumb` (image/placeholder), `Dialog` (generic accessible modal), a single `FeedForm` powering both the dialog and the standalone route, and a shared icon set.
- Concerns are separated (`lib/` for data/theme, `components/` for UI), and the theme/data logic is isolated from presentation.

**Key trade-offs (good to mention 1–2)**
- **Dialog vs. page** for New: a modal keeps you in context on the list; I kept `/feeds/new` as a deep-linkable fallback.
- **Fixed app-shell** (header/scroll area/footer) for an app-like feel, with the view switching to natural scrolling on small screens.
- **Placeholders over stock photos** to keep the build self-contained and honest about A1 scope.

---

## 3. Project continuity (~15s)
- Everything is shaped for Assessment 2: feed items already match an RSS-like schema, detail routes are dynamic, and the image slots + local data layer swap directly onto a live server feed with no UI rework.

## 4. Close (~10s)
- "That's the frontend — focused on clear structure, consistent, accessible, responsive design, and ready to connect to the RSS server in Assessment 2. Thanks for watching."

---

### Quick rubric checklist (make sure each gets a mention)
- [ ] **Structure / page layout** — Home, About, Feeds/Posts, Settings; consistent header; hierarchy
- [ ] **Themes & persistence** — light/dark, cookie + localStorage, no-flash boot
- [ ] **Usability / accessibility / responsive** — hamburger, focus, dialog, reduced-motion, mobile reflow
- [ ] **Interactive views & sample/local data** — search, create/delete, dynamic detail routes, breadcrumb, hide/show
- [ ] **Code quality & modularity** — reusable components, separation of concerns
- [ ] **Verbal justification** — the design-choices section above
