# Seed: Ilo Odena

The example site a fresh install can start as (roadmap item 2, step 4;
decisions, 2026-10-24 and 2026-10-28), shaped on nicksaraev.com. Every post
and page is marked as an example (`metadata.example`).

```sh
npm run seed -- ilo
```

It loads into the database in `.env.local` and skips anything already
there. Posts and pages are in the CMS's own agent format
(`src/lib/agent/markdown.ts`); an image is written `![alt](file:name.jpg)`
and a video `::video media=file:name.mp4`, and each becomes an upload from
`media/`. Pages are made in file-name
order, which is the order they're listed in.

## Who she is

Ilo is one of the Humans of Y3K (`~/Documents/Code/Y3K/app/(club)/humans.ts`):
long braids, silver glasses shaped like dragonfly wings. In that story she
spent three summers at a lake and made **Hollow**, a palm-sized stone that
holds one drop of lake water, in Y3K's cohort 02. Odena is a quiet nod to
Odonata, the dragonflies.

She makes objects, writes, and keeps **moments**: a few seconds of a place,
with whatever else was in the air. Her glasses keep them. The site never
explains how.

## Voice

- Quiet, exact, sensory. Short sentences. Concrete nouns over adjectives.
- Never says "the future", "year 3000", "Renaissance", "multi-sensory" or
  "AI". The reader should think "who is this?", not be told.
- Home, About and the press kit are in the third person (like
  nicksaraev.com); her writing, My story and Work with me in the first.
- Y3K appears plainly in About, the press kit and Follow. Never as an ad.

## What's in here

| File | Becomes |
| --- | --- |
| `site.json` | The site's name; Writing (stacked like a blog, in the nav) with Listening, Making and Habits inside it |
| `media/` | Her portrait, the black-sand shore, the lake and an 8-second loop of her, from Y3K |
| `pages/01-home.md` | Home: the portrait, three short paragraphs; the format adds Writing, About, Follow and the newsletter |
| `pages/02-about.md` | About (in the nav): short, two images |
| `pages/03…05` | My story, Press kit, FAQ, under About |
| `pages/06-work-with-me.md` | Work with me (in the nav): four ways |
| `pages/07-follow.md` | Follow: YouTube, Newsletter, Instagram, X, Y3K Club |
| `posts/*.md` | Six essays in Writing, 2025–2026; three with a picture or the loop |

## Made up for the seed

Beyond the Y3K story (Hollow, the lake, the glasses, cohort 02), these are
invented and Alex's to change:

- She grew up in the wetlands; her grandmother kept bees and gave her the
  glasses; she worked a fruit stall at nineteen.
- She keeps about one moment a week, and never faces.
- Two Hollows a year on commission, listening walks, four-session "small
  version" mentoring, talks and essays (Work with me).
- The handles (@iloodena, @ilo.odena) and the address ilo@example.com
  (`example.com` is reserved for examples, so it reaches nobody).
- Three new essays: "Four in the morning", "Answering slowly", "What I
  bring to the lake".
