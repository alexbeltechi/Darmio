# Seed: Ilo Odena

The example site a fresh install can start as, shaped like a creator's
personal site: writing, a home page, about, collaborate. Every post
and page is marked as an example (`metadata.example`).

A fresh install offers it on the setup screen ("Start with"), and
Settings › Examples adds it later or removes it in one step: every example
goes, except what the maker changed or still uses (their post in Writing,
their page under About). On a computer, the same load is:

```sh
npm run seed -- ilo
```

It loads into the database in `.env.local` and skips anything already
there. `site.json`'s `label` and `about` are what the setup screen shows. Posts and pages are in the CMS's own agent format
(`src/lib/agent/markdown.ts`); an image is written `![alt](file:name.jpg)`
and a video `::video media=file:name.mp4`, and each becomes an upload from
`media/`. Pages are made in file-name
order, which is the order they're listed in.

## Who she is

Ilo is one of the Humans of Y3K, the makers of Y3K Club's story:
long braids, silver glasses shaped like dragonfly wings. In that story she
spent three summers at a lake and made **Hollow**, a palm-sized stone that
holds one drop of lake water, in Y3K's cohort 02. Odena is a quiet nod to
Odonata, the dragonflies.

She makes objects, writes, and keeps **moments**: a few seconds of a place,
with whatever else was in the air. Her glasses keep them. The site never
explains how.

## Voice

- Quiet, exact, sensory. Short sentences. Concrete nouns over adjectives.
- About says it once, plainly: she's a maker from the year 3000. Nowhere
  else says "the future", "Renaissance", "multi-sensory" or "AI".
- Home and About are in the third person; her writing and Collaborate in the first.
- Never "services": what she does with other people is Collaborate.
- Y3K appears plainly in About and Follow. Never as an ad.

## What's in here

| File | Becomes |
| --- | --- |
| `site.json` | The site's name; Writing (stacked like a blog, in the nav) with Listening and Making inside it |
| `media/` | Her portrait, the black-sand shore and the lake, from Y3K; an 8-second loop of her, not on the site yet |
| `pages/01-home.md` | Home: the portrait, two short paragraphs; the format adds Writing, Follow and the newsletter |
| `pages/02-about.md` | About (in the nav): a few lines, one image |
| `pages/03-collaborate.md` | Collaborate (in the nav): 1:1, In a group, Ceremonies. No email |
| `pages/04-follow.md` | Follow: YouTube, Newsletter, Instagram, X, Y3K Club |
| `posts/*.md` | Seven short posts in Writing, 2025–2026: three with a picture, four text only, mixed. Placeholders, meant to be replaced |

## Made up for the seed

Beyond the Y3K story (Hollow, the lake, the glasses, cohort 02), these are
invented, and yours to change:

- She keeps about one moment a week.
- Collaborate: a season one to one, a slow morning in a group, and
  ceremonies (a stone cut for a place, and a morning there).
- The handles (@iloodena, @ilo.odena). She has no email: there's none in
  her year, so Collaborate ends "You know where to find me."
- The posts, all placeholders.
