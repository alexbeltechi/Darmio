# Darmio

**Set up Darmio:** paste this into your AI (Claude Code, Codex, or any AI
that can run commands), and it puts your own Darmio online:

```
Set up Darmio for me: https://github.com/alexbeltechi/darmio. Follow its INSTALL.md.
```

**Already set up?** Your admin, where you write, publish and change
everything, is always your site's address with `/admin` at the end, for
example `https://my-site.vercel.app/admin`.

---

An open-source publishing platform for makers, agent first. Publish by asking
your agent, or by hand in a simple admin. A headless CMS (posts, pages, a
media and documents library, a content API) with an optional site built on
the Parabola design system (`packages/parabola`).

Not released yet: the pre-release is planned for 2026-11-25.

## Run it locally (developers)

See the last section of `INSTALL.md`. In short: `npm install`, fill in
`.env.local` from `.env.example` (with a `SETUP_CODE`), `npm run dev`, then
open `http://localhost:3010/admin/setup?code=<SETUP_CODE>`.

## Read first

`docs/conventions.md` (the one way to do each common job) and
`packages/parabola/README.md` (the design system).

## Installs

A maker's site is an install: their own copy of this repo, their own
database and keys. Installs pull updates from here. Customise through
settings, themes and blocks rather than code, and updates stay easy to take.
