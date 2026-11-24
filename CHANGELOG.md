# Changelog

## Unreleased

- Publishing a post without a title or a category says so on the field,
  before the "Publish post?" confirm, instead of failing after it.
  Categories carry the required star, like Title.
- Choosing Text, Quote or YouTube from a post's or page's + menu puts the
  cursor in the new block, so what you type goes there.

## 0.1.0 · 2026-11-24 · the first public pre-release

Darmio is a publishing platform for makers, built to be run by your AI. You
write, publish and change your site by asking your agent, or by hand in a
simple admin. Open source under MIT: you run it yourself, in your own Vercel
and MongoDB Atlas accounts.

This is a pre-release. It works, and it will change. Where you get stuck,
open an issue on GitHub.

### Set it up

Paste one line into your AI (Claude Code, Codex, or any AI that can run
commands):

```
Set up Darmio for me: https://github.com/alexbeltechi/darmio. Follow its INSTALL.md.
```

It makes your copy, puts it on Vercel with a MongoDB Atlas database and Blob
storage, and hands you your admin at `/admin`. You click a few things on the
way; it tells you which and why.

### What's in it

- **Posts and pages.** Posts in categories, shown as a feed, a grid or a
  list. Pages as Text, Home, Links or Blocks, pages under pages, and pages in
  the menu. A post can have custom styling of its own; delete the post and
  its custom code goes with it.
- **Made for reading.** A 700px reading column on every page. Pictures fill
  it, portraits too. Footnotes: type `^[the note]` in the text (or use the
  editor's Footnote button) and the notes appear numbered at the end of the
  post. The list style reads like an archive, grouped by month, and a page
  can open with one paragraph in its own words instead of a title. Related
  posts sit under each post.
- **Categories inside categories.** A sub-category takes its parent's look
  unless it has its own, and has its own place in the menu.
- **A blank slate, with an example.** A new site starts with Ilo Odena's
  example site so you see how it fits together; **Remove examples** in
  Settings leaves your own empty site.
- **The Library.** One place for pictures, video, documents and any other
  file, with one picker everywhere. Replace a file and it changes wherever
  it's used.
- **Context for your agent.** Settings › Context is the list of what your
  agent reads first: your own documents, or a brain you keep elsewhere.
- **Built for agents.** An agent API that lists everything an agent can do,
  a content API for your own front end, and a newsletter sign-up
  (through Kit, with your own Kit account).
- **Several sites, one admin.** Each project has its own database; switch
  between them from the menu.
- **Parabola, the design system.** The site and the admin are built on it
  (version 0.5.4). Make your own theme as one file and add it in Settings ›
  Design (`docs/themes.md`), choose how the top menu looks (no background,
  blurred or solid), or copy Parabola's pieces into another project with
  `npx`.
- **One set of brand controls for everything.** Parabola's Theme page, at
  `/parabola/theme`, is a board: your site, a letter, an app, an Instagram
  carousel and a reel side by side, all changed by the same controls. Start
  from Classic or one of the styles, change anything, and keep it as your
  own. A theme carries its social rules too (post size, edges, text on
  pictures), and **Export** gives the whole style as words to paste into
  any AI, a brand kit, or a design system.
- **Skills for Claude Code:** `/landing-page` makes a page from an idea or an
  `.md`; `/post` turns a folder of pictures or video into a post.

### Not in it yet

- **Export and import** of a whole site in one file comes in a later version.
- Your own domain per project: today the public site shows the first
  project.

### The fine print

MIT, see `LICENSE`. If you run Darmio for clients on more than 5 projects,
please buy an agency licence: a request, not a licence term (README). The
name has its own short policy, `TRADEMARK.md`, still marked as a draft. To
help build it: `CONTRIBUTING.md`.
