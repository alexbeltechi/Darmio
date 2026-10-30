---
name: landing-page
description: Make a new page in the CMS in one go: a draft page, its MD (Alex's own .md, or one written from his prompt) and a wireframe from real Parabola components. Use when the user wants a new page, says "create a page", "landing page", "let's make a page for…", shares an .md or an idea for a page, or wants another wireframe or to build an existing page from its wireframe.
---

# Make a page: document → page → wireframe

When Alex says "create a page", he should arrive at a wireframe. One run, no
stops in between: by the end, admin › Pages › <page> shows the page, its MD
and its wireframe.

## Setup

`GET /api/admin/agent` explains the API. Needs the dev server
(`preview_start` with `darmio-dev`) and the token:

```bash
export $(grep CMS_AGENT_TOKEN .env.local | xargs)
```

Local dev writes to the live database. Create only what the page needs;
everything stays a draft.

## 1. The MD

Alex can also drop anything else readable into a page's Documents (notes, HTML, text, CSV, JSON): read them with `GET /docs/{id}?format=md` before working on the page.

The MD is the page's memory: what it's for and what it says, so work can pick
up from it later. One per page, named after the page: `work-with-me.md`.

- **Alex gave an .md file**: attach it word for word. Don't rewrite it,
  restructure it or summarise it.
- **Alex gave only a prompt**: write the MD from it. Plain Markdown: the goal
  in a line, who it's for, then the page top to bottom as real copy (a `##`
  per section). Keep his words where he used them. Put what you assumed under
  `## Open questions` at the end, not in the chat.

Create it with `POST /docs`:
`{"title": "work-with-me.md", "kind": "brief", "body": "…"}`.
In the admin it shows under Documents, with its file name, date and size.

## 2. The page

`POST /collections/pages/entries/markdown`, front matter only:

```md
---
title: Work with me
slug: work-with-me
description: One line, for search results and sharing.
docs: <the MD's id>
---
```

The page stays empty until Alex approves a wireframe.

## 3. The wireframe

**One self-contained HTML file** built from **the real Parabola components**,
never imitations. It shows under Wireframes on the page.

1. Read `packages/parabola/README.md`.
2. Write `page.tsx` in the scratchpad: a default-exported component, no hooks
   or state, importing from `@beltechi/parabola` (`DsButton`, `DsPill`,
   `DsDivider`, `DsPlaceholder`…). Layout is plain Tailwind with Parabola
   tokens only (`bg-ds-surface-subtle`, `text-ds-fg-muted`, `rounded-ds-lg`,
   `text-h2`…), no hex and no raw palette. Icons come from `lucide-react`.
3. Use the real copy from the MD. Every image is a
   `<DsPlaceholder ratio="3/2" note="what goes here" />`.
4. Follow what the MD asks for visually (a loop, a grid, a split).
   Improvise what Parabola lacks (a display type size, say) inside the file.
   Don't add tokens or components to Parabola without asking.
5. Build it:
   `npx tsx scripts/wireframe-build.ts page.tsx --title "Work with me" > wireframe.html`
6. Upload it: `POST /wireframes` with `{"page": "<slug>", "title": "<page name>", "html": "…"}`.
   Name it after the page. Add a word only for a variant ("Work with me, bolder").
7. Check `/api/admin/wireframes/{id}` in the browser at desktop and phone
   width: no sideways scroll, and nothing broken.

Then tell Alex it's on the page, in two or three lines: what's on it and what
you had to make up. Ask the open questions after he's seen it, not before.

## Iterating

- Feedback on layout: rebuild and `PATCH /wireframes/{id}`, or add a variant
  to compare.
- Feedback that changes content: update the MD first (`PATCH /docs/{id}`),
  then the wireframe. When Alex gave the MD, ask before editing it.

## Building the page

Only when Alex says so. Write the page from the MD and the approved
wireframe with the existing blocks
(`PUT /collections/pages/entries/{slug}/markdown`). Where a section needs a
block that doesn't exist, propose it (existing block, a variant, or a new
block in `packages/parabola/blocks/`) and build it only after he
agrees, following the block contract in the Parabola README. Never publish.
