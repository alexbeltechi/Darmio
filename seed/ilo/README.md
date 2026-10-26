# Seed: Ilo Odena

The example site a fresh install ships with (roadmap item 2, step 4;
decisions, 2026-10-24). Every post and page here is marked as an example
and goes in one action, leaving the plain feed.

Posts and pages are in the CMS's own agent format (`src/lib/agent/markdown.ts`),
so the seed script posts them exactly as an agent would. Empty galleries
carry `placeholder` lines: they are the shot list until the media exists.

## Who she is

Ilo is one of the Humans of Y3K (`~/Documents/Code/Y3K/app/(club)/humans.ts`):
long braids, silver glasses shaped like dragonfly wings. In that story she
spent three summers at a lake and made **Hollow**, a palm-sized stone that
holds one drop of lake water, in Y3K's cohort 02. That is the soft plug, and
it is already true inside the story.

Odena is a quiet nod to Odonata, the dragonflies.

She makes objects, writes, and keeps **moments**: a few seconds of light,
with whatever else was in the air (temperature, sound, smell). Her glasses
keep them. The site never explains how.

## Voice

- Quiet, exact, sensory. Short sentences. Concrete nouns over adjectives.
- Never says "the future", "year 3000", "Renaissance", "multi-sensory" or
  "AI". The reader should think "who is this?", not be told.
- The home page and About are in the third person (like nicksaraev.com);
  her writing is in the first.
- Y3K appears twice, plainly: in About, as where she made Hollow, and in
  Elsewhere. Never as an ad.

## What's in here

| File | Becomes |
| --- | --- |
| `site.md` | Settings (site name), categories, nav, the home page's blocks and copy, newsletter copy |
| `pages/about.md` | The About page |
| `posts/*.md` | Three writing posts and six moments, published, backdated |

## Media

| Asset | Where | Status |
| --- | --- | --- |
| `ilo.mp4` + `ilo.jpg` (blinks, glances aside) | Home intro portrait | Exists in Y3K. Alex to confirm it can ship in an open-source repo |
| `p21.jpg` (portrait, dragonfly glasses) | About, top | Same |
| `ilo-lake.jpg` (seen from behind, at the lake) | About, beside Hollow | Same |
| Six moments (three stills, three loops) | `posts/moment-*.md` | To make. The `placeholder` lines are the brief |

Moments are what her glasses saw, so they are first person: her hands, her
shadow, what she looked at. Never her face. Loops are 3–5 seconds, 720p, no
sound, under 1.5 MB each; stills up to 2560px on the long edge. The whole
seed stays under 15 MB so the repo stays light.
