---
name: post
description: Turn a folder of images or video into a CMS post. Best from a /curate selection folder (its order, title, description, captions and keywords come along); any plain folder works too. Scans the assets, asks how to frame it, uploads, and creates a backdated draft the user refines live in the admin. Use when the user points at a folder and wants it posted, says "post this", "upload this", "make a post from this folder", or is working through an archive. Also handles follow-up edits to a post made this way (culling assets, reordering, changing date or layout, publishing).
---

# Post a folder

Ingest a folder into the CMS as a **draft** the user reviews in the admin while you keep editing it conversationally. The user does the judgment calls; you do the mechanics.

A folder that went through `/curate` first makes a better post: the curator has already picked, ordered, titled and described the frames. Prefer it, and when the user points at a raw folder that has a `_curate_*` effort next to its photos, say so and offer to use its selection.

## Setup

Start with `GET /api/admin/agent`: one short document with the API, the post Markdown format and the live category ids. Use it instead of reading the code or fetching whole posts to learn the rules.

Requires `CMS_AGENT_TOKEN` in `.env.local` and the dev server running. Load the token into the environment for every script call:

```bash
export $(grep CMS_AGENT_TOKEN .env.local | xargs)
```

Set `CMS_URL` to target something other than `http://localhost:3000`.

Only one `next dev` can run per checkout (the `.next/dev` lock). If a server is already up — often from another session — use it rather than starting a second one.

## 0. What's been done here already?

Every folder `/post` has worked on keeps an activity log, `_activity.md` beside the originals: one terse line per action (create, update, publish, replace, delete…), and under it only the frames that action changed (`+` added, `-` removed, `~` replaced old→new, with media id, fingerprint, sha). Replaying it gives each post's frames now. It travels with the folder, so a copy on another drive or a local folder carries its history. Start every run with:

```bash
npx tsx scripts/ingest/status.ts "<folder>"
```

Read-only. It reads the logs in the folder and below, and checks each post they name against the CMS now: still there, draft or live, how many of the logged frames it still holds. Folders with pictures and no log are listed separately (never posted with `/post`, or posted before the log existed). Say what it found in a line or two before anything else ("Padiș went up as `larisa-padis`, live, 12/12 frames; Krapets has no log"). The log is a history, not the truth: when it and the CMS disagree, the CMS wins, and say so. When the user wants to refine a post that's already up (swap images, add the missing ones, drop some), that's the same plan re-run with `--duplicate=update`, not a new post.

## 0b. Curated or not?

Look for `selection.json` in the folder (a `selection_YYYY-MM-DD` folder made by `/curate`). If the user gave a `_curate_*` folder instead, list its `selection_*` folders and ask which one; if it has none, offer to run `/curate`'s select step first rather than posting the whole folder.

When there is a `selection.json`, it is the plan's source:

- **Assets and order**: `files[]` in `order`; skip any with `file: null` (an export error) and say so.
- **Title**: `title` (the set's title) as the first suggestion.
- **Intro**: `description` (the set's description, or the curation's summary) as the lead text.
- **Per frame**: `caption` → the asset's `caption`; `keywords` (and any readable `text`) → the asset's `keywords`, with `"keywordsBy": "/curate"` on the plan. Never write them into `tags`; tags are the user's own. Write `title`, `alt` and `description` from the catalogue too (see 2b), and set each asset's `source` to the original so the log lands in the shoot folder, not the selection.
- **Dates**: exports other than `original` have their metadata stripped, so take `capturedAt` from each file's `source` (the original), not the exported copy. Scan the source folder for that.
- **More context**: `curation` names the effort; its `<id>.json` in the `_curate` folder above has the sets, near-duplicates and, if one was written, an `article` (sections with headings, observations and frames). Offer an article as a story post (`blocks`) instead of one gallery.

Then go to **Ask** with most answers already filled in.

## 1. Scan

```bash
npx tsx scripts/ingest/scan.ts "<folder>" --depth 1
```

Read-only. Returns assets with dimensions, orientation, and a `capturedAt` per file, plus a `suggestedDate` (median of capture dates), a `dateRange`, and `groups` — an asset count per subfolder.

On dates: `dateConfidence: "exif"` means real capture metadata and is trustworthy. `"mtime"` means filesystem dates — reliable in this archive (folders copied around kept their file mtimes), but worth showing the user for confirmation rather than assuming.

If `groups` shows several subfolders with meaningful counts, ask whether they are one post or several before going further.

## 2. Ask

Summarize what you found in a couple of lines — asset count, date, orientation mix, subfolder split. Then ask with `AskUserQuestion`, pre-filling your deduced answers so the user is confirming rather than typing:

- **Title** — `suggestedTitle` is derived from the folder name and is usually too literal. Offer it plus a better alternative.
- **Categories** — fetch live IDs from `/api/admin/categories`; never guess them.
- **Date** — offer `suggestedDate`, and say which signal it came from.
- **Layout** — `auto` (the default: sized by image count; 1–3 stack large, more go in rows), `stack` (one image a row, each as large as it may be, for a run of focus images), `masonry` (mixed orientations), `grid` (uniform).
- **Assets** — skip for a curated selection (the curator already chose). Otherwise, if the folder holds more than ~12, or has obvious duplicates and process shots, ask which to include rather than uploading everything.
- **Tags** — the names that make the set findable later: places, people, the project or client, the camera or film, the occasion. Take them from what the user told you in this conversation (and the folder names), never invent them, and offer them for confirming or editing. Confirmed, they go on the post (`tags`) and on every image (`mediaTags`), so searching the media library for "Coliba" finds every frame.

Ask in one batch. Don't ask about things the user can trivially fix in the admin afterwards.

## 2b. Words for each image

Quality over tokens: look at every frame you upload (the contact sheet you showed, a `/contactsheet` of the chosen frames, or the `/curate` catalogue, which already looked). Every image gets all of these; `push.ts` refuses an image without `alt` or `keywords`.

- **`title`**: a short plain name for the picture, 3 to 8 words: "Loaded mountain bike on a granite crag". It also becomes the file name (`loaded-mountain-bike-on-a-granite-crag.jpg`), so it's what a search engine reads first. Specific nouns, no "image of", no file numbers.
- **`alt`**: one sentence, under ~125 characters, saying what's in the frame for someone who can't see it: subject, action, setting. "A white Specialized full-suspension bike with bikepacking bags leans on a lichen-covered rock above farmland at sunset."
- **`description`** (optional): one or two sentences of context a search might use: place, occasion, what makes it this picture.
- **`keywords`**: what someone would type to find it, specific to broad, 10 to 25: `specialized fsr comp`, `full suspension mountain bike`, `mountain bike`, `bicycle`, then setting, light, season (`granite`, `crag`, `farmland`, `golden hour`, `autumn`), plus readable text (signs, logos). Lowercase, singular, English. A make or model only when you can really tell. No names (those are tags), no judgments (`beautiful`). `"keywordsBy": "/post"` on the plan (or `/curate` when they came from its catalogue).

The words should help three jobs later: finding the frame in the media library, reusing it in another post, and replacing it with a better export (a replacement keeps them). Say in a line that you've written them; no need to ask about each one. The user can edit or clear them per image in the media panel.

## 3. Push

Write a plan to the scratchpad and run it:

```bash
npx tsx scripts/ingest/push.ts <plan.json>
```

Plan shape is documented at the top of `scripts/ingest/push.ts`. Creates a **draft** by default; `--publish` goes live.

Before uploading it reads the logs in the originals' folders. If these frames already went into a post that still exists, it uploads nothing, says which post (and its status), and exits with code 2. Ask the user with `AskUserQuestion`: update that post (`--duplicate=update`), make a second post of them (`--duplicate=new`), or stop. Don't pick for them. A post named in the log that's since been deleted is mentioned, not a blocker.

After the run it adds one line to each originals folder's `_activity.md`, with only the frames that changed under it (a re-run that only edits text logs just the line), and writes `slug` and `batchId` back into the plan, so the next run of the same plan updates that post. A new plan whose slug is already taken stops rather than overwrite another post.

Both `date` and `publishedAt` get backdated — the public feed sorts on `publishedAt`, so skipping it would file a 2015 project under today.

Then give the user the admin edit URL from the script output and stop. They look at it; you wait.

## 4. Iterate

The user reviews in the admin and comes back with changes. Keep the plan file around — it is the source of truth for the folder-derived parts.

For asset changes (cull, add, reorder), edit the plan's `assets` array and re-run `push.ts`. It is idempotent: identical bytes are reused by sha256 rather than re-uploaded, and an existing slug is updated rather than duplicated. A reused image keeps its tags and keywords and gains the plan's.

To add tags or keywords to images already up (a post made before this, or a new name the user mentions), PATCH each media item with the merged list: `{"tags": [...]}` or `{"keywords": [...], "keywordsBy": "/post"}`. Find them with `GET /media?fields=id,name,tags,keywords&q=<word>`.

For text, captions-as-placeholders and block order, use the Markdown endpoints rather than resending the post (see the guide): read with `GET …/entries/<slug>/markdown`, change a few blocks with `PATCH …/entries/<slug>/blocks`, and add `?dryRun=1` to check a change first.

For other fields, PATCH directly. `data` merges shallowly, so send whole fields. Changing the date means sending both `data.date` and `publishedAt`:

```bash
curl -X PATCH "$CMS_URL/api/admin/collections/posts/entries/<slug>" \
  -H "Authorization: Bearer $CMS_AGENT_TOKEN" -H "Content-Type: application/json" \
  -d '{"data":{"date":"2019-06-01T12:00:00.000Z"},"publishedAt":"2019-06-01T12:00:00.000Z"}'
```

Publishing (when asked): `POST $CMS_URL/api/admin/publish` with `{"slugs":["<slug>"]}`.

**Log every action.** `push.ts` logs its own runs; anything else you do to a post made from a folder (publish, unpublish, delete, replace an image, change the date) gets a line too. One word for the action, a short note only when it adds something:

```bash
npx tsx scripts/ingest/activity.ts add "<originals folder>" publish <slug> --status published
npx tsx scripts/ingest/activity.ts add "<originals folder>" replace <slug> --replace DSCF6400.JPG=<oldId>><newId> --note "brighter export"
npx tsx scripts/ingest/activity.ts add "<originals folder>" date <slug> --note 2019-06-01
```

`activity.ts show "<folder>"` prints each post's frames per the log, as JSON.

**Replacing an image** with a better export of the same picture: `POST /media/<id>/replace` (multipart `file`, plus `sourcePath`). It swaps the file in every post that uses it and keeps its title, alt, caption, tags and keywords unless you send new ones. Log it (`replace`, above).

If the user edited the post in the admin between your runs, re-running `push.ts` overwrites `content`, `title`, and `categories` from the plan. Pull the entry first and ask before clobbering their work. Once a post is published, a re-push keeps it published and stages the changes; for a reorder or a cull, prefer a staged PATCH of `data.content` (`{"stage": true, "data": {"content": [...]}}`) that keeps the user's text, and log it (`activity.ts add … regroup|update`).

## Deleting, and media left behind

Deleting a post or culling frames never deletes media by itself. Media is removed only when the user says yes to a list of it, the same as in the admin's delete dialog.

- **Deleting a post** (only when asked): run `DELETE …/entries/<slug>?dryRun=1` first. Show the user its `media` (used only by this post: names and count) and `keptMedia` (also used elsewhere, with where: these always stay). Ask with `AskUserQuestion`: delete the post only, or the post and those media items. Then send the DELETE, with `{"deleteMedia":[ids]}` only for the items they said yes to. Log it: `activity.ts add "<folder>" delete <slug>`, with `--note "media deleted: 9"` when media went with it.
- **After a re-push that dropped frames**: the dropped items are still in the library. Check each with `GET /media/<id>/usage`; list the ones nothing uses any more and ask before deleting them (`DELETE /media/<id>`). Don't leave them silently, and don't delete them unasked.

## Provenance

Every run stamps `metadata.source` on the post (`path`, `batchId`, `ingestedAt`, `assetCount`) and `source.path` on each media item (the original file, so a library search for "DSCF6400" finds it). The folder's own record is its `_activity.md` (above), read by `status.ts`. Use those; don't reconstruct history from post titles.

## Working through an archive

When the user points at a parent folder rather than one project, run `status.ts` on it first, then scan with `--depth 2`. List the candidate projects with counts, deduced dates and what their logs say (posted where, or nothing yet), and let them pick which to do. Ask about all the picked projects in one `AskUserQuestion` batch rather than one round each. Then run the loop above one project at a time — one post fully done and confirmed beats ten drafts needing cleanup.
