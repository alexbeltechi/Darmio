---
reviewed: 2026-10-26
owner: Alex
---

# Conventions

The standard: every pattern in this codebase should be one Alex would be
happy to see an agent copy, because agents copy what they find. Write code
that way, and when you find a pattern you wouldn't want copied, fix it or
list it under Known debt below.

One way to do each thing. When a job below comes up, use the way listed;
don't write a second one beside it. Most of these are enforced by
`npm run verify` (lint), and the lint message points back here.

If the paved way doesn't fit, change it for everyone (and this file) or ask.
Don't add a local workaround: a second way gets copied, and then there are
three.

## Before you commit

`npm run verify`: route types, typecheck (app and `scripts/`), lint with no warnings allowed,
Parabola's token check, and a production build (the dev server lets a client component import
server code, such as the database; Vercel's build doesn't). It must pass. Data is the live database, so check UI
changes in the running app with read-only actions (see `CLAUDE.md`).

## Paved paths

| Job | The way | Enforced |
| --- | --- | --- |
| UI | Parabola components and tokens (`packages/parabola/README.md`, imported as `@beltechi/parabola`) | lint: raw palette, shadcn colour names, raw Radix |
| A primitive Parabola lacks | Add it to Parabola, on Radix if needed, then use it | lint: raw Radix outside Parabola |
| An empty section (no posts, nothing chosen, nothing matches) | `DsEmptyState`: one line, an optional button, centred in the section. Never a title plus a sentence | |
| A side note on a screen (another way to do it, a tip) | `DsInfoCard` | |
| How much is used or done (storage, a quota, progress) | `DsProgress`: a rounded track, a straight-edged fill, a `meter` with a label | |
| Something to copy (a prompt, a command, a link) | `DsCopyField`: read-only, copies the whole value. One cut-short line by default; `wrap` for a prompt someone should read first | |
| Messages after an action | `dsToast(...)`, failures as "Couldn't …" with the reason as `description` | lint: no `alert`, no `sonner` |
| Asking before an action | `useDsConfirm()` | lint: no `confirm` |
| A slug or file name from text | `slugify` from `@/lib/slug` | lint: no other `slugify` |
| A new id | `crypto.randomUUID()` | lint: no `uuid`, `nanoid` |
| Reading or writing MongoDB | A function in `src/lib/db/<collection>.ts` | lint: `mongodb` only in `src/lib/db` |
| A stored document as an app type | `withoutId<T>(doc)` from `@/lib/db/mongodb` | lint: no `_id` destructuring |
| Media and users | Through `src/lib/cms/media.ts` and `users.ts`: they also handle files, renditions and password hashes. Everything else calls `src/lib/db` directly | |
| Uploading images from disk | `scripts/ingest/push.ts` (the `/post` skill): every image gets Alex's confirmed tags, a title, alt and keywords from looking at it, and the run is logged in the folder's `_activity.md` (decisions, 2026-10-20) | |
| Logging another action on a folder's post (publish, delete, replace) | `scripts/ingest/activity.ts add` | |
| Searching media | `mediaMatches` from `@/lib/cms/media-search` (library, picker and `GET /media?q=`) | |
| Spacing (gaps, margins, section padding) | Parabola's spacings, named by size (`/parabola/spacing/scale`): 4, 8, 16, 20, 40, 80, 160 as `gap-ds-20`, `px-ds-20`, `pt-ds-160`, `space-y-ds-40`… Layouts that do arithmetic use `DS_SPACES` / `DS_GUTTER_PX`. New code uses these, not raw `gap-5` | `check:parabola` keeps CSS and TS in step |
| Field widths and form layout | Parabola's standard field width (`--ds-field-width`): leave fields their default size and lay a form out with `DS_FIELDS_CLASS`. `w-full` only for a field that fills its row, `ds-fields-fill` on a container one field wide. No per-screen `max-w-[…]` on fields | |
| Space between pictures (galleries, post grids, feeds) | The gutter (`DS_GUTTER_PX`, 20px across and down): no gallery or grid sets its own gap | |
| Showing an uploaded image | `MediaImage` (renditions as a srcset); a plain URL from `@/lib/cms/media-url` only for legacy uploads and admin thumbnails | |
| Who may call `/api/admin/*` | `src/middleware.ts` (session or agent token). Routes don't check auth themselves | lint: no `getServerSession` |
| Who made a change | `getActor(request)` and `logActivity(...)` | |
| Loading a whole admin list (posts, pages, media) | `fetchAll` from `@/lib/api/fetch-all`: pages through `{ data, total }`; a bare `fetch` stops at the API's default 50 | |
| API responses | `{ data }` on success, `{ error }` with a 4xx/5xx status on failure, `{ success: true }` from DELETE | |
| A field with a fixed set of values | An `as const` list beside the type in `src/lib/cms/types.ts` (`GALLERY_LAYOUTS`); agent input is checked against it and rejected with the allowed values, never cast | |
| Leaving a field out | `const { secret, ...rest } = obj` (lint allows the unused name) | |

## Comments

A comment says what the code can't: why it's this way, a constraint, a
decision (cite `docs/decisions.md`), or what a long screen's section is.
Never what the next line does (`// Get the entry`), and never history
("replaces the old…"); git has the history.

`eslint-disable` needs a reason on the line before or after `--`, and lint
fails on one that no longer suppresses anything.

## Known debt

Second ways that still exist. Fix them when you're in the file; never copy
them. The lint exceptions for them are in one block in `eslint.config.mjs`,
and that list only shrinks.

- Raw Radix in `media-detail-modal`, `media-picker` (Dialog) and
  `gallery-block-editor` (Popover): needs a Parabola modal and popover.
- Admin screens call `fetch` directly and parse `{ data }`/`{ error }` by
  hand; `DatabaseErrorHandler` wraps `window.fetch` to catch database errors.
  Needs one admin fetch helper.
- API routes each repeat try/catch, logging and the database error check.
  Needs one route wrapper in `src/lib/api`.
- `src/app/admin/media/page.tsx` (~1,600 lines) and
  `src/components/admin/post-editor-form.tsx` (~1,300) need splitting.
- No tests yet.
- `src/middleware.ts` uses the file name Next 16 deprecates; it becomes
  `src/proxy.ts` (exporting `proxy`). It's the auth gate, so move it on its own
  and check sign-in and agent-token access after.
