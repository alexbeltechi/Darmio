# Dharmify

An open-source publishing platform for makers, agent first. Publish by asking
your agent, or by hand in a simple admin. A headless CMS (posts, pages, a
media and documents library, a content API) with an optional site built on
the Parabola design system (`packages/parabola`).

Not released yet: the pre-release is planned for 2026-11-25. Until then this
README is for working on Dharmify itself.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in MONGODB_URI (its own database) and NEXTAUTH_SECRET
npm run dev                   # http://localhost:3010/admin runs the first-time setup
```

## Read first

`docs/vision.md`, `docs/roadmap.md`, `docs/decisions.md`, `docs/conventions.md`.

## Installs

A maker's site is an install: their own copy of this repo, their own
database and keys. Installs pull updates from here. Customise through
settings, themes and blocks rather than code, and updates stay easy to take.
