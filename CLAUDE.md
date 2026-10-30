# Darmio

An open-source publishing platform for makers, agent first: a headless CMS
with an optional site built on the Parabola design system. This repo is the
**core**. Installs (a maker's own copy) are built on top of it and pull its
updates; Alex's own install is `alexbeltechi/beltechi`. Private until the
pre-release on 2026-11-25, then public.

**Only what every maker would want goes here.** Nothing about one person's
site: no names, copy, categories or keys in code. A site's content and
settings live in its database; its keys in its deployment's environment.

## Read first

- `docs/conventions.md`: the one way to do each common job (ids, slugs,
  toasts, database access, comments…). Use it; don't write a second way.
- `CLAUDE.local.md`, if there is one (it stays out of git): the maintainer's
  private context, with intent, decisions and the roadmap. Read what it
  points to before changing anything; a call made there isn't reopened, a
  conflict is flagged.

## Before you commit

Run `npm run verify` (typecheck, lint with no warnings, Parabola tokens, a
production build) and make it pass. A lint error usually means there's already a way to do that
thing: the message names it. Don't silence a rule to get past it.

## Keep the docs current

This repo holds only what ships: code, README, INSTALL, conventions. Intent,
decisions and plans stay out of it. When a change settles a call or finishes
a planned item, record it where `CLAUDE.local.md` points.

## Design system

UI is built on **Parabola**, its own package in this workspace
(`packages/parabola`, imported as `@beltechi/parabola`, showcase at
`/parabola`). Read `packages/parabola/README.md` before adding or changing UI. In short:

- Build screens from Parabola components and tokens. No raw Tailwind palette
  classes, no hex colours.
- Parabola first. shadcn/ui is a fallback only when Parabola lacks something:
  wrap it as a Parabola component on top of Radix (as `DsSidePanel` does),
  never use it raw in a screen.
- Parabola holds tokens and primitives only. Page-specific layouts stay with
  their page.
- Code prefix is `ds` (`DsButton`, `--ds-*`, `bg-ds-*`); "Parabola" is the brand.
- After changing a token, run `npm run check:parabola`.

## Data

Local dev (`.env.local`) points at a database of its own (`darmio-dev`), never
at a real install's. It starts empty: the first visit to `/admin` runs the
setup. Test data is fine there. Dev server: `preview_start` with `darmio-dev`
(port 3010, so it runs beside an install on 3000).

## Skills

`/contactsheet` and `/curate` live in their own repo,
`~/Documents/Code/techistack` (public at
[alexbeltechi/techistack](https://github.com/alexbeltechi/techistack)), and
are linked into `~/.claude/skills/`, so every project, this one included,
uses them. Work on them there, not here. This repo keeps only CMS-specific
skills (`landing-page`, `post`), which ship to every install.
