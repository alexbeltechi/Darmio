import { NextResponse } from "next/server";
import { listCategories } from "@/lib/db/categories";
import { getCurrentProject } from "@/lib/db/mongodb";

// GET /api/admin/agent - Everything an agent needs to work with this CMS, in
// one short Markdown document: the rules, the endpoints, the post Markdown
// format and the live category ids. Read this first instead of the code.
export async function GET() {
  const [categories, project] = await Promise.all([listCategories(), getCurrentProject()]);
  const projectLines = project
    ? `
## This project
${project.name} (\`${project.slug}\`). Every request works on one project: send \`x-darmio-project: <slug>\` for another; GET /projects lists them.${project.brain ? `
Its brain: ${project.brain}. Read it before you write anything for this project.` : ""}
`
    : "";
  const guide = `# Darmio: agent guide
${projectLines}
Base: /api/admin. Auth: \`Authorization: Bearer $CMS_AGENT_TOKEN\`.

## Rules
- Lists are for finding; to write, edit, quote or match the voice of a post, read it in full first (Markdown).
- New posts are drafts. Saving a published post stores unpublished changes; the site keeps the live version until it's published.
- Publishing goes through POST /publish. Only publish, unpublish or delete when the owner asks for it.
- Every change is logged (GET /activity), marked as made by an agent.
- Every image you upload is findable: tags (places, people, project, camera) taken from what the owner said and confirmed by them, and keywords for what's in it from looking at it (keywordsBy says who). Never invent tags; never upload bare images. From disk, use scripts/ingest/push.ts (the /post skill), which does both, names files for search, and logs every run in the folder's _activity.md (one line per action, changed frames under it); scripts/ingest/status.ts says what a folder's log has done and whether those posts still exist.

## Posts
- GET  /collections/posts/entries?fields=summary&status=draft&q=word&changes=1&limit=50
       Compact list. fields: slug,id,title,status,date,updatedAt,publishedAt,categories,tags,hasChanges,source,sourcePath,excerpt,blocks,mediaIds
- GET  /collections/posts/entries/{slug}/markdown       Read a post as Markdown (the version being edited). Front matter may carry an optional description: line, shown under the post in feeds; the owner mostly leaves it blank, so leave it blank too unless asked.
- PUT  /collections/posts/entries/{slug}/markdown       Replace content and given front matter from Markdown (?dryRun=1 to preview)
- POST /collections/posts/entries/markdown              Create a draft from Markdown (?dryRun=1)
- PATCH /collections/posts/entries/{slug}/blocks        {"ops":[...]} small edits (?dryRun=1):
       {"op":"replace","block":"3f2a91c0","markdown":"..."}
       {"op":"insert","after":"3f2a91c0"|"start","markdown":"..."}   (or "before"; no position = at the end)
       {"op":"remove","block":"3f2a91c0"}
       {"op":"move","block":"3f2a91c0","after":"7be04d12"}
- POST /publish {"slugs":[...]}                          Make drafts / unpublished changes live
- DELETE /collections/posts/entries/{slug}               Delete a post; its media stays unless listed in {"deleteMedia":[ids]}.
       ?dryRun=1 first: "media" is what only this post uses, "keptMedia" what others also use (never deleted).
       Show the owner that list and ask; send deleteMedia only with ids they said yes to.
- GET  /activity?limit=50                               Recent changes

## Pages
Pages live at /<slug> and use the same blocks and Markdown as posts. Front matter: title, slug, description, docs (comma-separated doc ids), and the page's format and place:
- format: text (a title, its line, then the text in a reading column: About, My story, Press kit, FAQ, Work with me), home (the intro; the site adds the latest posts, the pages under each page, the links pages and the newsletter), links (a title and links), or blocks (the default: the page is its blocks, full width)
- parent: <slug> puts the page under another, one level deep (Press kit under About); nav: yes puts a top-level page in the site's nav
- posts: <category slug> (home: whose posts it lists); newsletter: Heading | one line (home: the sign-up at its foot)
- links: then one indented line each, "  - Label | https://… | note" (links pages)
The home page is the page with slug home. Write the page's words; the format does the layout.
- GET  /collections/pages/entries                       List
- GET  /collections/pages/entries/{slug}/markdown       Read a page as Markdown
- PUT  /collections/pages/entries/{slug}/markdown       Replace content and given front matter (?dryRun=1)
- POST /collections/pages/entries/markdown              Create a draft page from Markdown (slug from front matter)
- PATCH /collections/pages/entries/{slug}/blocks        Small edits, as for posts
- POST /publish {"slugs":[...],"collection":"pages"}    Make a page live (only when the owner asks)

## Docs
Markdown that guides the work: a brief (strategy for one post or page), a source (raw material), a guide (site-wide rules). the owner sees every doc in admin › Agent, so store nothing anywhere else. Before working on a post or page, read the docs it lists.
- GET  /docs                                            All docs, with where each is used (usedBy)
- GET  /docs/{id}?format=md                             One doc's Markdown
- POST /docs {"title","kind":"brief|source|guide","body","stage"?,"links"?}   Create (or multipart: file=.md, title, kind)
- PATCH /docs/{id} {"title","kind","body","stage","links"}   Edit (links replaces the list: [{"label","url"}], url "/…" or https)
- the owner calls docs "Documents" (any text file: .md, .txt, .html, .csv, .json) and sees each by file name: title a page's MD after the page ("work-with-me.md"). A new page gets its MD (his .md word for word, or one written from his prompt), the draft page and a wireframe in one go (landing-page skill); blocks come later, when he asks.
- Attach a doc by listing its id in a post's or page's \`docs:\` front matter (comma-separated).

## Wireframes
Self-contained HTML sketches of a page, before it's built. They belong to the page and are deleted with it. Build one from the real Parabola components: write a page.tsx (default-export component, imports from @beltechi/parabola, Tailwind with ds tokens) and run \`npx tsx scripts/wireframe-build.ts page.tsx --title "…" > wireframe.html\`. No scripts (wireframes open sandboxed).
- GET  /wireframes?page={slug}                          A page's wireframes (no HTML)
- POST /wireframes {"page","title","html"}              Add one (or multipart: file=.html, page, title). Several per page are fine.
- GET  /wireframes/{id}                                 The HTML (?download=1 to save it)
- PATCH /wireframes/{id} {"title","html"}               Replace
- DELETE /wireframes/{id}
- Deleting a page deletes its wireframes and the docs only it uses (DELETE …/pages/entries/{slug}?dryRun=1 shows what).

## Media
- GET  /media?fields=summary&q=word&limit=50            Compact list; q searches names, title, caption, tags and keywords. fields: id,name,url,mime,width,height,size,alt,caption,title,description,tags,keywords,createdAt,fingerprint,sha256,sourcePath
       q also finds an image by the file it was uploaded from ("DSCF6400").
- POST /media (multipart: file, alt, caption, title, tags, keywords, keywordsBy, origin=agent, agent=claude)   Upload
- PATCH /media/{id} {"alt","caption","title","tags","keywords","keywordsBy"}    Edit a file's details
- tags are the owner's words (typed, or confirmed by them); keywords say what's in the picture, written by the agent that looked at it (keywordsBy "/post" or "/curate"), comma-separated on upload.
- POST /media/{id}/replace (multipart: file)            Swap the file everywhere it's used (the old file is deleted); keeps its title, alt, caption, tags and keywords unless sent

## Post Markdown
\`\`\`
---
title: Post title
categories: design, journal
tags: comma, separated
date: 2026-10-03
---

<!-- block:3f2a91c0 -->
Plain Markdown is a text block: paragraphs, ## headings, **bold**, *italic*, lists, links.

<!-- block:7be04d12 -->
:::gallery layout=auto|stack|grid|masonry columns=3 width=auto|large|full   (auto layout: the default. Inline galleries of 1-3 images stack them one a row, each as large as it may be (a focus section); bigger galleries run in rows that read left to right, 3 a row inline and 2-7 at full width by screen size. Rows fill the width but never enlarge an image past its own pixels or beyond about a screen's height. stack: one image a row, each as large as it may be, whatever the count. columns is for grid and masonry. width auto: the default, inline (1024px) under 20 images, the page's whole width from 20 (about four rows); large: always inline; full: always the whole width. To alternate focus and overview, use several gallery blocks.)
![label](media:MEDIA_ID)
![what image should go here](placeholder)
:::

:::quote attribution="Who said it"
The quote.
:::

::divider
::video media=MEDIA_ID caption="..."
::youtube url="https://..." caption="..."
::newsletter heading="Get new work by email" text="One email a month." button=Subscribe list=news source=about   (a sign-up form posting to this CMS's POST /api/subscribe; every attribute optional; source defaults to the page's path)
\`\`\`
- \`<!-- block:ID -->\` keeps a block's identity when writing back; leave it off for new blocks.
- In a gallery the image text is only a label; edit a file's caption with PATCH /media/{id}.
- A placeholder line makes an empty gallery with a note: shown in the editor and preview, never on the live site.
- Front matter: only title, categories, tags and date are written; slug and status are read-only.

## Categories (id: label)
${categories.map((c) => `- ${c.id}: ${c.label}`).join("\n")}
`;
  return new NextResponse(guide, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
