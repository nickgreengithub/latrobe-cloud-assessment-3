# Assessment 1 — RSS Server Frontend (LMS)

Next.js App Router frontend for an **RSS Server → LMS** announcement experience. Assessment 1 is **frontend only**: Module 4-style sample posts are stored in `localStorage`. Live RSS ingest is reserved for Assessment 2.

## Stack

- Next.js (App Router) + React + TypeScript
- Custom CSS design system ([`design.md`](design.md)) with Alliance No.1 / No.2 fonts
- Theme preference via **cookie**; compact list preference via **localStorage**

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Home — project intro + workflow overview |
| `/about` | Name, student number, how-to video slot, continuity notes |
| `/feeds` | Feed/post list (sample + local drafts) |
| `/feeds/new` | Create a local feed item |
| `/feeds/[id]` | Dynamic detail page |
| `/settings` | Light/dark theme + compact list preferences |

## Student details

Edit [`lib/student.ts`](lib/student.ts) before submission (name + student number appear in the header/footer/About page).

## Design notes

Visual language follows [`design.md`](design.md): cyan 1px lines, transparent outline controls, Alliance fonts from `public/fonts/`. Dark theme uses the design tokens directly; light theme adapts the same structure for the rubric.

## GitHub

Replace this line with your repository URL after pushing:

`https://github.com/<you>/<repo>`

## Submission checklist

- [ ] Update `lib/student.ts`
- [ ] Add short how-to clip on About (`public/demo.mp4` or embed)
- [ ] Record 3–8 min walkthrough (student ID, face, voice)
- [ ] Zip **without** `node_modules`
- [ ] AI acknowledgement + Turnitin similarity score
