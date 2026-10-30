---
reviewed: 2026-10-29
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
      The CMS always carries the Parabola in its own repo, so a release has
      the latest by construction; publishing it (and, if it earns it, its
      own repo) is for other projects, such as y3k.club (Alex, 2026-10-28).
   2. **Blank slate.** Done 2026-10-26 in `darmio` (decisions,
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
      of the Humans of Y3K (`seed/ilo/`, decisions 2026-10-24 and
      2026-10-28), shaped on nicksaraev.com: a **Writing** category (a list
      like a blog), a **Home** page (her portrait, three short paragraphs,
      the latest writing with year and read time, About's pages, Follow's
      links, the newsletter), **About** with **My story**, **Press kit**
      and **FAQ** under it, **Work with me**, and **Follow**. Nav:
      Writing, About, Work with me. Everything is marked as an example and
      removed in one action, which leaves the plain feed.
      In order:
      - **a. V0 folder.** Done differently 2026-10-26: `darmio`'s own
        checkout, on its own empty `darmio-dev` database, is the blank
        install; the Ilo seed goes there.
      - **b. Blank slate first** (step 2). Done 2026-10-26.
      - **c. Page formats instead of new blocks.** Done 2026-10-28
        (decisions): Text, Home, Links and Blocks; pages under pages; pages
        in the nav; the category `list` layout; presets in New page; posts
        have a read time; the nav as a bar with the name on the left; a
        square image fills an inline gallery; text reads at 600px. Parabola gained
        `DsLinkList`, a ghost button's current state and a ghost theme
        switch. Left with the site's pages: the page title (with the page
        it sits under) and the section heading.
      - **d. Seed script.** Done 2026-10-28: `npm run seed -- ilo` loads the
        settings, categories, media, posts and pages, each marked as an
        example (`metadata.example`), and skips anything already there.
        Left: **Remove examples** in Settings, and seeding from setup, so a
        maker without a terminal gets Ilo's site (the owner comes from
        setup, not the script).
      - **e. Media.** Done 2026-10-28 with three Y3K images of Ilo (the
        portrait, the black-sand shore, the lake) and an 8-second loop of
        her, 1.2 MB in all; three essays carry one each. Moments
        are out of the seed (decisions, 2026-10-28).
      - **f. Install by AI** (decisions, 2026-10-26): `INSTALL.md`, the
        README's one prompt, the setup code. Done 2026-10-26; next, Alex
        runs it from scratch with a fresh AI chat. A deploy button and a
        start page only if testers get stuck. Was: **Setup screen and Deploy button,** README for testers, an
        install skill. The V0 doesn't need these (the seed script makes the
        owner), so they come after it.
      Done: a non-technical maker deploys and sees Ilo's site without a
      terminal; before that, the V0 folder runs Ilo's site from its own
      database.
   5. **Projects.** First version done 2026-10-26 (decisions): the hub, a
      database per project, the switcher and Add project, onboarding with
      several projects. Later: more accounts with roles (owner, editor),
      per project. Left: domains (the public site shows the first
      project today), a project's own connection string and media store,
      renaming a project in Settings. Was: a hub holding each project's name, domains, encrypted
      connection string, media store and agent token; the project menu on
      the rail mark switches between them; the host picks the project on
      the public site; no memberships. Done: beltechi.com and Y3K Club run
      on one deployment from separate databases, switched from the rail.
   6. **Media stores.** One storage interface; Blob shipped, S3-compatible
      (R2) when a brand's volume needs it.
   7. **Custom code pages.** A page kind whose body is a component in the
      repo, listed and deletable in the admin, for one-off editorial pages.
   8. **Portable from day one** (decisions, 2026-10-28; BEL-113). A
      `schemaVersion` on every stored thing (posts, pages, categories,
      media, settings, agent documents) and one migration step an import
      runs, so a file from an older or newer Darmio still comes in. Then
      the export: one file with a project's content, settings and agent
      documents, plus its media, and the import of it, in the admin and
      through the agent API. WordPress and Ghost in, WordPress out: later,
      their formats are documented.
      Done: a project exported from one install imports into a fresh one
      and looks the same, after a schema change in between.
   9. **Release pass:** the docs still name Alex as the maintainer and his
      sites in examples; go through them, add a leak check to `verify`, and
      neutral package scope (`@beltechi/parabola` today). The legal pages
      (decisions, 2026-10-28): the fair-use ask in the README ("Darmio is
      MIT. Use it however you like. If you run it for clients on more than
      5 projects, please buy an agency licence. It keeps Darmio going."),
      a one-page trademark policy in Ghost's shape, and a contributor
      agreement in `CONTRIBUTING.md`; the release copy says "open source
      under MIT, run it yourself" and nothing about hosting or forever.
      Then the **pre-release tag** on 2026-11-25, the end of Alex's Y3K
      cohort 2; beltechi.com moves from Framer onto it, and Y3K testers
      install it.

   Started 2026-10-24: the site name setting (Settings › Site), the rail
   mark as the project menu, Settings › Account with change password, and
   `npm run reset-password` for lock-outs.
   Named **Darmio** (decisions, 2026-10-26); was Dharmify, and before
   that Beltechi CMS (`beltechi-cms`).
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
  MIT `LICENSE` added 2026-10-27; the legal pages are step 9 of the
  pre-release. Done: a non-technical person can install it locally with
  their agent, following a README and agent skills that ship with the repo.
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

## Three Darmios

Self-hosted free under MIT, a paid web version later, themes that work on
both (decisions, 2026-10-28). These make room for it in the core without
building the web version, which stays unannounced until the open-source
release is out. Each is a Feature in Linear (project Darmio, milestone
Feature roadmap), unscheduled until Alex places it.

- **MCP connector** — `shape` (BEL-111)
  An MCP server on every install over the agent API that exists today.
  Any agent that speaks it (Claude Code, Claude Desktop, Cursor, one in
  Slack) works on the site; Darmio never locks to one.
  Done: from a fresh Claude Desktop, a maker connects their install in one
  step and publishes a post by asking.
- **Agent activity** — `shape` (BEL-114)
  The admin shows what agents did: every change through the API with the
  agent's name, and a short summary each agent leaves at the end of a
  session through one tool. The web version's chat panel, a pasted key on
  self-hosted, and a web chat that drives a local agent are later, and the
  last only through the maker's own site.
  Done: after a Claude Code session on the site, the admin says what
  changed and why, in the agent's words.
- **Web version** — later, unannounced
  Darmio hosted by us, one deployment per customer running released
  public code, our agent inside, billed monthly; private code is only
  billing, accounts and the agent runtime. "Take it with you": a
  self-hosted copy of the exact site, code and theme included. Not before
  the open-source release.
- **Parabola themes, customizable like shadcn** — `doing` (BEL-109)
  Started 2026-10-28 (decisions): themes as data in a library per
  project (Parabola and any added, one in use, picked in Settings › Design),
  made on `/parabola` like shadcn's create page: theme colour, typography, buttons
  and accent colour, light and dark, font families (Font, Heading, more), added
  Google fonts, the type scale with weights, the radius (None to Large)
  and the icon library (Lucide only). 2026-10-29: a **character** layer
  above it (decisions): dials that set the look as a whole (base colour,
  brightness, warmth, contrast, roundness, depth), every value under them
  Auto until given its own; an agent sets a look by moving dials and
  adding at most a couple of overrides, never by writing hexes. Next:
  done the same day: Style (Mood, Serious to Wacky, moving dials and fonts;
  Appearance) and the Taste pills with Shuffle (`taste.ts`). Then: a
  Spacing dial (card padding, section gaps, margins through the
  `--ds-space-*` tokens); a loudness dial (how much accent); an agent
  growing the tastes from outside (font trends on Google Fonts, a Figma
  file, Mobbin, an awards site) and setting a look from a screenshot as
  dials; a story editor in the CMS (lines placed and dragged over a photo
  or video, one to three of them, walking a narrative, as Instagram does;
  an agent drafting one from a folder of images); a
  section wearing a sub-theme (a hero in a derived variant); a brand brief
  the theme exports (palette by role, fonts, a sample button, tone words,
  image mood) for pages, decks, emails and images; tinted neutrals in
  light (text a near-black of the base's hue); a periodic audit, like
  /garden for the brain, that builds a sample page from the system and
  proposes changes; icons through one Parabola
  component so other libraries work, uploading a font file, spacing in the theme, import of
  a theme file, and an agent setting it through the API.
  A theme contract (which tokens and block variants a theme may set) and
  themes as data (`*.theme.json`), imported and switched in Settings ›
  Design or by an agent. Anyone can make their own design system from it.
  Done: a maker's theme changes their whole site and comes off again,
  without touching code.
- **Extensions** — `shape` (BEL-110)
  Blocks, page formats and interactions in a folder the install owns
  (`src/extensions/`), each with a manifest the editor and agents read, so
  they survive pulling Darmio's updates. Today blocks are a fixed list in
  `src/lib/cms/types.ts`.
  Done: a page format from outside the repo is added with one command and
  shows up in the editor; a later pull doesn't conflict with it.
- **Store-ready** — `shape` (BEL-112)
  Paid themes and formats live outside the free repo: themes apply as
  data, code installs from a registry with keys (as paid shadcn blocks do),
  payments and keys through Polar. Ours, and other designers' on
  commission; every theme installs on self-hosted and on the web version
  alike. First a private repo sold through Polar, then the registry, then
  a Design tab in the admin. The agency licence (one-off, perpetual,
  unlimited) is sold the same way.
  Done: a maker buys a theme on darmio.io, tells their agent to install
  it, and their site has it.

## Later

- **Agent as curator:** given the whole archive, propose case studies, series
  and collections.
- **Post as email:** send a post to subscribers, publish it to the site, or
  both.
- **Marketing, outreach and email** in both versions, the way Polsia covers
  them: the list, posts to X and LinkedIn, follow-ups, one agent across it.
- **Planner:** a Linear-like planner for makers.

## Done

- 2026-10-07 — Committed the file cards, the lifestyle → journal redirect and
  the landing-page skill update.
