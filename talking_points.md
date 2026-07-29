# Assessment 1 — Video Talking Points

**Student:** Nicholas Green · **ID:** 22840097
**Project:** Admin frontend for an RSS **server** — an admin authors categorised announcement **posts** that the server publishes as RSS; client apps (an LMS among them) consume them in Assessment 2. It *creates and categorises* feeds — it is **not** an aggregator that collects them. *(Per the unit clarification from Tony.)*
**Scope:** Assessment 1 is *frontend design & usability only* — sample/local data stands in for the live RSS backend, which arrives in Assessment 2.

> Two things the rubric rewards in the video: (1) a clear **how-to-use** walkthrough, and (2) an **insightful justification** of design decisions, usability, trade-offs, and project continuity. This script covers both. Speak to the points, don't read them verbatim.

### Logistics (from the unit recordings)
- **Length: aim for ~6–8 minutes.** A 3-minute video scores poorly; the expectation is roughly **2 minutes demoing what the app does, then the rest showing + explaining/justifying** design choices ("show me this, explain that").
- **Identity:** your **name + student number must be on the About page** (and they're in the footer). Show the About page on camera. Reading the number aloud isn't required, but state your name at the start.
- **Submission:** **upload the video file to the LMS** (the uni-preferred way — avoid link-only, and don't commit a large video into the GitHub repo). GitHub holds the *source*; a live deployment isn't required for Assessment 1 (that's the Docker/EC2 backend work in Assessment 2).

---

## 0. Opening (~20s)
- "Hi, I'm Nicholas Green, student 22840097. This is my Assessment 1 submission — the admin frontend for an RSS server."
- What it is: an admin authors announcement **posts**, each filed under a **category**; the server publishes these as RSS feeds. In Assessment 2, client apps (an LMS being one) subscribe and display them. Stress: it *creates and categorises* feeds — it is **not** an aggregator that collects external ones.
- "Assessment 1 is frontend and usability only, so posts are sample content stored locally."

---

## 1. How to use the site — walkthrough (~2 min)

**Home**
- Landing page orients the user: a large **Feeds/Posts** card as the primary action, with **About** and **Settings** below.
- The illustration is a deliberate placeholder for feed media (more on that under design choices).
- Click **Open feed**.

**Feeds / Posts** (the core screen)
- List of the server's **posts**. Point out each card: **category tag**, image slot, date, author, title, summary — and that the **whole card is clickable**.
- **Search** posts live **+ filter by category** (the "N of M" counter updates).
- **New** — opens an accessible **dialog** to author a post, including its **category** (demo: fill title/summary/content, pick a category → Publish → it appears at the top instantly).
- Click a card to **open the post in place** inside the same panel — the container heading becomes the post title, the toolbar/count disappear, and a back button returns you. *(There's also a dynamic route `/feeds/[id]` as a deep-link.)*

**Opened post (in place)**
- Hero image slot, **category tag**, metadata (date/author/source), the full body, and **Back**/**Delete** — all without leaving the Feeds screen.

**About**
- Student details, project scope, a slot for this how-to video, and a **References** section that **hides/shows** (collapsible).

**Settings**
- **Theme** toggle (light/dark) — flip it and note the whole app updates instantly.
- **Compact post list** — turn it on, return to Feeds, show the denser layout.
- **Reset sample posts** restores the seed data.

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
- Posts are seeded into **localStorage** and fully CRUD-able locally (author via the dialog with a **category**, open in place, delete) — a realistic stand-in for the categorised posts the server will publish as RSS in A2.
- Navigation & filtering aids: **category filter**, live **search**, a **dynamic detail route** (`/feeds/[id]`), an inline **breadcrumb**, active-state nav highlighting, and the **hide/show** References panel.

**Accessibility (WCAG-informed)**
- Semantic landmarks (`header`/`main`/`nav`/`footer`), a **skip-to-content** link, and a visually-hidden `<h1>` on each page so the heading outline stays intact even though titles aren't shown.
- The New-post dialog uses the **native `<dialog>` element**, so focus-trapping, Escape-to-close, and an inert background come from the platform; focus lands on the first field, and returns cleanly on close.
- Visible focus outlines, `aria-current` on the active tab, labelled icon buttons, and a **`prefers-reduced-motion`** fallback that disables animations.

**Image placeholders — a deliberate trade-off**
- Every post reserves an **image slot**. Until the RSS server supplies media in A2, I render a **deterministic gradient placeholder** (stable per item, and computed without randomness so server and client render identically). The code already prefers a real image when an `imageUrl` is present — so nothing changes when live media arrives.

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
