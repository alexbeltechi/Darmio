---
reviewed: 2026-10-26
owner: Alex
---

# Roadmap

The ordered backlog. Alex sets the order; the agent picks from the top of
**Now**. Each item says what done looks like, so it can be checked.

Status: `ready` (clear enough to start), `shape` (needs a design-process
interview first), `doing`, `review` (waiting on Alex), `done` (move to the log
at the bottom with the date).

When a task changes an item, update this file in the same change.

## Now

1. **Curator skill** — `doing`
   `/curate`: point it at a folder of work and it selects, groups and frames
   posts, learning from the maker's feedback. It's built for Alex's archive
   ([mission](missions/archive.md)) but meant to ship to every maker.
   `/contactsheet` (numbered sheets + manifest, read-only on sources) and
   `/curate` (brief → survey → see → open a `_curate` effort → report → pick → prepare)
   are in `.claude/skills/`, built CMS-agnostic.
   Done: Alex runs batches without picking files himself and mostly approves
   with small changes.

2. **Pre-release: blank slate, projects, Parabola as a package** — `doing`
   Shaped 2026-10-24 from Alex's brief (decisions, 2026-10-24): the CMS
   comes out of the box as posts and one feed, grows navigation as pages and
   categories appear, runs all of Alex's brands from one admin, and ships
   Parabola as a package other projects install. In order:
   1. **Workspace split.** npm workspaces: `packages/parabola` (its own
      `package.json`, README and showcase, published to npm by version) and
      the CMS as the app. Done 2026-10-24 in the repo: Parabola is
      `@beltechi/parabola` (TypeScript source, compiled by Next through
      `transpilePackages`), the CMS uses the copy in the repo whatever its
      version, and `npm run verify` passes. Left: Alex confirms the name
      and runs `npm publish` from `packages/parabola` when a project
      outside the CMS needs it.
      Done: another project installs Parabola from npm and renders a block.
   2. **Blank slate.** Done 2026-10-26 in `dharmify` (decisions,
      2026-10-26), with the first-run setup screen. Was: category groups and the nav come from categories (a
      group and a nav flag), not code; hero and intro copy, site name,
      footer and the rail mark come from settings; the nav appears as
      categories are marked for it or pages are published; the feed sizes
      like a gallery (one post centred, a few stacked, many in a grid).
      Done: a fresh database shows a working site with nothing of Alex's in
      it.
   3. **Settings as stacked sections.** Done 2026-10-24: Site, Library,
      Integrations (each name opens its account; the original post link
      sits with them), Agent (rules), Account; homepage layout, activity,
      collections, storage and the API list are gone (decisions,
      2026-10-24). Next, as each lands: Navigation, Design (token
      overrides, theme toggle), Features (gallery controls, lightbox).
      Layouts move to the page they belong to, never here.
      Done: everything a project can vary is on this page, no code edit.
   4. **First run: the launch package.** The seed is **Ilo Odena**, one
      of the Humans of Y3K (`seed/ilo/`, decisions 2026-10-24), shaped on
      nicksaraev.com: categories **Writing** and **Moments**, an **About**
      page, and a home page from blocks that overrides the feed (intro with
      her portrait loop, latest writing as a list with year and read time,
      latest moments as a strip, links, a newsletter form at the foot). Nav:
      Writing, Moments, About, Newsletter. Everything is marked as an
      example and removed in one action, which leaves the plain feed.
      In order:
      - **a. V0 folder.** Done differently 2026-10-26: `dharmify`'s own
        checkout, on its own empty `dharmify-dev` database, is the blank
        install; the Ilo seed goes there. Was: a second clone of this repo (not a fork) beside
        it, with its own `.env.local`: the same Atlas cluster but its own
        database in the URI (`/ilo-v0`), no Blob token (uploads stay in the
        folder), its own `NEXTAUTH_SECRET` and agent token. It is what a
        tester gets, and it is the separate dev database of item 3: agents
        test there, never on the live data.
      - **b. Blank slate first** (step 2): without it the V0 still shows
        Alex's Design, Photography and Journal.
      - **c. Blocks:** intro (portrait, video allowed), latest posts (by
        category, as a list or a strip), link list, newsletter (the Kit
        session). Posts gain a read time.
      - **d. Seed script:** `npm run seed -- ilo` creates the owner from
        the terminal, the settings, categories, pages and posts (through
        the agent Markdown API), uploads the media, marks every item as an
        example; "Remove examples" in Settings undoes it.
      - **e. Media:** six moments (three stills, three 3–5s loops, first
        person, never her face; briefs in each post's placeholder line) and
        Alex's OK to ship the Y3K Ilo images in an open-source repo.
      - **f. Setup screen and Deploy button,** README for testers, an
        install skill. The V0 doesn't need these (the seed script makes the
        owner), so they come after it.
      Done: a non-technical maker deploys and sees Ilo's site without a
      terminal; before that, the V0 folder runs Ilo's site from its own
      database.
   5. **Projects.** A hub holding each project's name, domains, encrypted
      connection string, media store and agent token; the project menu on
      the rail mark switches between them; the host picks the project on
      the public site; no memberships. Done: beltechi.com and Y3K Club run
      on one deployment from separate databases, switched from the rail.
   6. **Media stores.** One storage interface; Blob shipped, S3-compatible
      (R2) when a brand's volume needs it.
   7. **Custom code pages.** A page kind whose body is a component in the
      repo, listed and deletable in the admin, for one-off editorial pages.
   8. **Release pass:** the docs still name Alex as the maintainer and his
      sites in examples; go through them, add a leak check to `verify`, and
      neutral package scope (`@beltechi/parabola` today). Then the
      **pre-release tag** on 2026-11-25, the end of Alex's Y3K cohort 2;
      beltechi.com moves from Framer onto it, and Y3K testers install it.

   Started 2026-10-24: the site name setting (Settings › Site), the rail
   mark as the project menu, Settings › Account with change password, and
   `npm run reset-password` for lock-outs.
   Named **Dharmify CMS** (decisions, 2026-10-26); the repo keeps
   `beltechi-cms` for now.
   Replaces "Clean up for a first release": the walkthrough as "a
   photographer who wants to publish" is step 4's done test.

3. **Collaboration setup** — `doing`
   Context docs (this file, `vision.md`, `decisions.md`, `conventions.md`),
   `npm run verify` (done 2026-10-10: types, lint, Parabola tokens), a
   separate dev database with seed data, and a verify skill that drives the
   app.
   Done: an agent can make a change, prove it works in the running app without
   touching live data, and open a PR with evidence.

4. **Gardening** — `doing`
   Keep one paved way per job (`conventions.md`) and pull out second ways
   before they spread. Done 2026-10-10: dead files and routes, one slugify,
   one id generator, one Mongo read helper, Parabola-only colours, narration
   comments, lint rules for each path. Left, in order: one route
   wrapper for API errors; one admin fetch helper (retires the `window.fetch`
   wrapper); a Parabola modal and popover for the last raw-Radix screens;
   tests for the pure logic (`node:test`, no new dependency); splitting the
   media page and post editor.
   Done: the known-debt list in `conventions.md` is empty.

## Next

- **Archive gardening** — `doing`
  Go back and forth on the archive (re-curate, re-post, delete) without the
  media library filling with stale items. Done 2026-10-19: deleting a post
  can take the media only it uses, after a list (decisions, 2026-10-19), in
  the admin, the API and `/post`. Next: the check below, built into `/post`
  (now the activity log, below; a better export → `POST /media/{id}/replace`, which keeps the image's words);
  an "Unused" filter and clean-up in the media library; a re-render script
  from the originals on disk.
  Done: re-posting a project Alex already posted leaves one item per frame
  and nothing unused that he didn't choose to keep.
- **Already posted? check** — `doing`
  Changed 2026-10-20: a local activity log, not a library-wide fingerprint
  match (decisions, 2026-10-20). Done: `_activity.md` in each folder `/post`
  works on, `scripts/ingest/status.ts` (what a folder's logs did, checked
  against the CMS now), and `push.ts` stopping before a second post of the
  same frames. Next: an admin view of a post's log? (Alex's call; the log
  lives on disk, not on the server.)
  Done: pointed at a folder Alex has partly posted, it names the posted
  frames and their posts, in seconds, writing nothing.
- **Media pipeline** — `doing`
  Done 2026-10-08: AVIF renditions made at upload and served as a srcset, a
  JPEG/PNG fallback, image fingerprints on new uploads, the quality setting and
  storage use under Settings → Images (decisions, 2026-10-08). Next: Alex
  wipes and re-uploads the library through `/post` (the agentic test);
  fingerprints for anything kept rather than re-uploaded; a down-only
  re-compress script if storage ever needs it.
  Done: every image on the site is served from renditions, Blob stays well
  under 1 GB, and nothing looks softer than before.

- **Media keywords, tags and search** — `done` 2026-10-20
  Images carry `keywords` (attributed, clearable in the media panel) from
  `/curate` or `/post`, and `/post` puts Alex's confirmed tags on every
  image (decisions, 2026-10-20). One search (`mediaMatches`) for the
  library, the picker and `GET /media?q=`: names, title, caption, tags and
  keywords. Open: does an empty `alt` get filled from `caption`?

- **Design-process skill** — `shape`
  Written from how Alex actually designs. Starts by interviewing him about
  the goal (who the page is for, what it must achieve) and tests his hunch
  before any wireframe. `landing-page` builds on it. Improved monthly from
  logged corrections.
- **Posts that can be emails** — `doing`
  A post goes to the web, to subscribers, or both; the CMS owns the
  subscriber list and shows counts and what was sent
  ([mission](missions/newsletter.md)). Done 2026-10-24 (phase 0): sign-ups
  go through the CMS's own `POST /api/subscribe` and on to Kit behind a
  provider interface, set up in Settings › Integrations › Kit; the Parabola
  newsletter block places the form. Next: phase 1, the CMS's own list.
  Done: a "Web + email" post reaches the y3k list from the editor, and the
  Y3K signup form posts to the CMS instead of Kit.
- **Analytics** — `shape`
  Done: Alex can see visits and where they came from (LinkedIn, X, direct),
  without a paid third-party tier.
- **Persona walkthroughs** — `shape`
  Regular passes through the app as a persona (a photographer, a painter, a
  designer) to find UX and bug issues. Results land here as items.
- **Open-source readiness** — `shape`
  Done: a non-technical person can install it locally with their agent,
  following a README and agent skills that ship with the repo.
- **Swappable connectors** — `shape`
  Every outside service behind one interface, shipped with one connector
  set up (decisions, 2026-10-24). Already there: the newsletter list
  (`src/lib/newsletter`, Kit) and media storage (Vercel Blob). Next, in
  order: a "Connectors" view in Settings listing each job, the connector it
  runs on and its state, each with a short recipe (an agent-readable
  Markdown file shipped with the repo) for swapping it; then pull the
  database behind its interface (everything already goes through
  `src/lib/db`, so this is mostly making that boundary strict); then hosting
  (what's Vercel-specific: Blob, cron, the image pipeline's limits) so a
  Cloudflare recipe is possible.
  Done: a maker's agent, given only the repo and a recipe, swaps one
  connector (say Kit for another list, or Blob for R2) without editing code
  outside that connector, and Settings shows the new one.

- **techistack, open source** — `doing`
  `/contactsheet` + `/curate` published as a Claude Code plugin at
  [alexbeltechi/techistack](https://github.com/alexbeltechi/techistack)
  (v0.7.0 beta, 2026-10-08: curation folders, curator voice, article PDF, keywords, /scan, leave-out).
  Developed in its own repo, `~/Documents/Code/techistack`, linked into
  `~/.claude/skills/`. Done (v1.0): survived a few real curation batches;
  Alex calls it stable.

## Later

- **Agent as curator:** given the whole archive, propose case studies, series
  and collections.
- **Post as email:** send a post to subscribers, publish it to the site, or
  both.
- **Planner:** a Linear-like planner for makers.

## Done

- 2026-10-07 — Committed the file cards, the lifestyle → journal redirect and
  the landing-page skill update.
