# Design system — paste-to-file aesthetic

Use this document when building a new single-page utility in the same visual language as **paste-to-file**. The goal is a quiet, technical, minimalist dark UI: structure comes from **1px cyan lines**, not filled cards or heavy chrome.

Reference implementation: [`index.html`](index.html).

---

## Design principles

1. **Lines over boxes** — Prefer thin borders and grid dividers. Avoid visible panel padding wrappers, section titles in bordered containers, and solid background fills on inputs/buttons unless there is a strong reason.
2. **Transparent interiors** — Primary work surfaces (text areas, single-line inputs, action buttons) use **transparent backgrounds** so the page background reads through. Outer frames (e.g. main editor panel) may keep a subtle panel fill and border.
3. **Restrained accent** — Cyan (`#22d3ee`) is for values, actions, borders, and hover states. Body text stays cool gray-blue; labels stay muted.
4. **Soft glow, not neon** — Accent text and focused controls use **low-opacity** `text-shadow` / `box-shadow` in cyan. Never full-strength glow everywhere.
5. **Typography hierarchy** — Large cyan values; small uppercase tracked labels underneath. No decorative headings unless the product truly needs a title (this app omits a top brand bar on purpose).
6. **Centered narrow shell** — Content lives in a max-width column, vertically centered on the viewport, with a single footer divider and optional meta link (e.g. GitHub) bottom-right.
7. **Grid-native metrics** — Data readouts sit in a **2-column grid** with shared top/bottom borders and internal dividers only (no outer left/right border on the grid block, no gap between cells).

---

## Color tokens

Copy these CSS custom properties verbatim for consistency:

```css
:root {
  --bg: #05080d;
  --panel: #070b12;
  --input: #121a26;
  --input-strong: #182233;
  --line: rgba(34, 211, 238, 0.28);
  --line-strong: rgba(34, 211, 238, 0.55);
  --cyan: #22d3ee;
  --cyan-soft: rgba(34, 211, 238, 0.12);
  --text: #d7e6ef;
  --muted: #5f7384;
  --font-1: "Alliance No.1", sans-serif;
  --font-2: "Alliance No.2", sans-serif;
}
```

| Token | Role |
|--------|------|
| `--bg` | Page base; pair with subtle radial highlight (see below). |
| `--panel` | Optional filled frame for primary bordered regions (e.g. main editor). |
| `--input` / `--input-strong` | Legacy fills; prefer **transparent** for inputs/buttons in new UI. |
| `--line` | Default 1px borders, grid rules, footer divider. |
| `--line-strong` | Focus rings, button borders, emphasized edges. |
| `--cyan` | Primary accent: metric values, button text, icons, hover text. |
| `--cyan-soft` | Very subtle fills only if needed (most buttons skip fill). |
| `--text` | Body and input text. |
| `--muted` | Placeholders, stat labels, secondary copy. |

**Page background**

```css
background:
  radial-gradient(900px 500px at 50% -20%, rgba(34, 211, 238, 0.07), transparent 60%),
  var(--bg);
```

**Accent text glow** (metric values)

```css
color: var(--cyan);
text-shadow: 0 0 12px rgba(34, 211, 238, 0.35);
```

**Panel frame** (when a bordered region needs depth)

```css
border: 1px solid var(--line);
box-shadow:
  inset 0 0 0 1px rgba(34, 211, 238, 0.04),
  0 0 24px rgba(34, 211, 238, 0.05);
```

**Focus / hover** — Increase border to `--line-strong` or `--cyan`, add outer glow at ~0.12–0.28 opacity. Keep transitions **140ms ease**.

---

## Typography

### Font files

Ship and `@font-face` these assets (paths relative to site root):

| File | Family | Weight |
|------|--------|--------|
| `assets/fonts/alliance-no1-regular.woff2` | Alliance No.1 | 400 |
| `assets/fonts/alliance-no1-light.woff2` | Alliance No.1 | 300 |
| `assets/fonts/alliance-no2-light.woff2` | Alliance No.2 | 300 |

Always set `font-display: swap`.

### Usage

| Role | Font | Weight | Notes |
|------|------|--------|--------|
| UI default, buttons, primary values | `--font-1` | 400 or 300 | Body and large numbers. |
| Placeholders, compact inputs, stat labels | `--font-2` | 300 | Slightly softer secondary voice. |

### Scale (approximate)

| Element | Size | Other |
|---------|------|--------|
| Main textarea | `1rem` | `line-height: 1.65`, weight 300 |
| Stat value | `1.15rem` | cyan + glow |
| Stat label | `0.62rem` | uppercase, `letter-spacing: 0.12em`, muted |
| Text inputs / buttons | `0.9rem` | height `2.75rem` for controls |
| Footer / meta links | `0.68rem` | uppercase, `letter-spacing: 0.16em`, cyan at 55% opacity |

**Labels** — Use `text-transform: uppercase` and generous letter-spacing for micro-labels (WORDS, DELIMITER, GITHUB). Sentence case is fine for placeholders (“Paste your content here…”).

**Null / empty metrics** — Display an em dash `—` for unknown or N/A values, not `0` or “none”.

---

## Layout

### Shell

- `width: min(980px, 100%)`, centered, `height: 100%`.
- Vertical padding: `3.5rem 1.25rem` (mobile), `4.5rem 1.5rem` from `640px` up.
- Flex column, `justify-content: center`, `gap: 1rem`.
- `html, body`: full height, `overflow: hidden` for app-like single screen.

### Main content grid

- Two equal columns, `gap: 0.85rem`.
- Fixed-ish height: `min(420px, calc(100vh - 10rem))`, `min-height: 280px`.
- **Breakpoint `860px`**: single column, taller min height `560px`.

### Secondary column (“rail”)

- Flex column, **no border**, transparent background.
- Top: flexible metrics block; bottom: filename + actions (shrink-0).
- Use `gap: 0.85rem` between rail sections.

### Footer

- Top border only: `1px solid var(--line)`, `padding-top: 0.75rem`.
- Align content **flex-end** (e.g. GitHub icon + uppercase label).

---

## Components

### Bordered panel (primary pane)

Use for the main interactive region (e.g. paste area wrapper):

- Background `--panel`, border `--line`, panel shadow recipe above.
- Inner textarea: **no border**, **transparent** background, padding ~`1.1rem 1.15rem`.
- `:focus-within` on panel: stronger border + slightly stronger outer glow.

### Stats grid

- CSS grid: `2` columns; rows `auto auto 1fr` when the last row should absorb leftover height.
- Container: `border-top` + `border-bottom` only (no side border on the grid).
- Cells: `border-right` + `border-bottom`; remove right border on even columns, bottom border on last row.
- Cell padding: ~`0.85rem 0.6rem`; content **top-aligned** (`justify-content: flex-start`).

### Text input (single line)

- Height `2.75rem`, `1px solid var(--line)`, **transparent** background.
- Font `--font-2`, weight 300.
- Focus: `--line-strong` border, subtle cyan `box-shadow` (no fill change).

### Buttons (outline)

- Same height as inputs (`2.75rem`), **transparent** background.
- Border `1px solid var(--line-strong)`, text `--cyan`.
- Light outer glow at rest; stronger on hover.
- Hover: border `--cyan`, text `#a5f3fc`.
- Include small inline SVG icons (~`0.95rem`) where helpful.
- `:focus-visible`: `1px solid var(--cyan)`, `outline-offset: 2px`.

### Meta link (GitHub pattern)

- Inline flex, icon + uppercase label.
- Default `rgba(34, 211, 238, 0.55)` → hover `var(--cyan)`.
- No underline; no filled pill.

---

## Spacing rhythm

Prefer these increments:

| Token | Value | Typical use |
|-------|-------|-------------|
| Tight | `0.15rem` | Gap between value and label in a stat cell |
| Control gap | `0.4–0.55rem` | Icon-to-text in buttons; action button grid gap |
| Section | `0.7–0.85rem` | Rail gaps, main grid gap |
| Shell | `1rem` | Shell flex gap |
| Cell padding | `0.85rem × 0.6rem` | Stat cells |

---

## Motion

- Standard transition: `140ms ease` on `color`, `border-color`, `box-shadow`.
- Avoid bouncy or long animations; this UI should feel instant and precise.

---

## Responsive behavior

| Breakpoint | Behavior |
|------------|----------|
| `640px` | Increase shell horizontal/vertical padding. |
| `860px` | Stack main two-column grid to one column; adjust min height. |

---

## Accessibility notes

- Keep visible `:focus-visible` styles on buttons and inputs.
- Use `aria-label` on icon-heavy controls.
- Maintain sufficient contrast: body `#d7e6ef` on `#05080d`; muted labels are for supplementary text only, not primary actions.

---

## Anti-patterns (do not reintroduce)

- Large app title bars with heavy uppercase branding (unless the new product explicitly needs one).
- Filled cyan button backgrounds as the default (outline + glow is the pattern).
- Rounded “card” UI (`border-radius` is effectively **0** everywhere).
- Section headers like “CONTENTS” / “FILENAME” inside padded bordered boxes.
- Busy gradients, drop shadows unrelated to cyan, or third accent colors.
- Monospace font stacks — this system uses **Alliance**, not code fonts.

---

## Checklist for a new app

- [ ] Copy `:root` tokens and page background gradient.
- [ ] Load Alliance No.1 / No.2 `@font-face` rules.
- [ ] Center content in `min(980px, 100%)` shell.
- [ ] Structure UI with 1px `--line` borders; transparent inputs and buttons.
- [ ] Use 2-column stat grids with internal dividers for readouts.
- [ ] Footer: single top divider, meta link bottom-right.
- [ ] Hover/focus: 140ms, cyan border + soft glow only.
- [ ] Test at 860px for stacked layout.

---

## Optional: fallback fonts

If Alliance files are unavailable in a fork, fall back to a neutral sans stack but **preserve colors, borders, spacing, and uppercase micro-label rules**. Do not substitute a monospace face and call it the same design.

```css
--font-1: "Alliance No.1", system-ui, sans-serif;
--font-2: "Alliance No.2", system-ui, sans-serif;
```
