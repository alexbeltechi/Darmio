# Darmio

A publishing platform for makers, built to be run by your AI. Write, publish
and change your site by asking your agent, or by hand in a simple admin.
Open source under MIT: your own copy, on your own Vercel and database.

## Set it up

Paste this into your AI (Claude Code, Codex, or any AI that can run
commands), and it puts your own Darmio online:

```
Set up Darmio for me: https://github.com/alexbeltechi/darmio. Follow its INSTALL.md.
```

It makes your copy, puts it on Vercel with a MongoDB Atlas database, and
hands you your admin. You click a few things on the way; it tells you which
and why. Everything fits the free plans.

**Already set up?** Your admin is your site's address with `/admin` at the
end, for example `https://my-site.vercel.app/admin`.

What's in each version: `CHANGELOG.md`. This is a pre-release: it works, and
it will change.

## Feedback

Found a bug, got stuck, or have an idea? Email alexbeltechi@gmail.com.
Anything goes, a line is enough.

## Licence

Darmio is MIT. Use it however you like. If you run it for clients on more
than 5 projects, please buy an agency licence. It keeps Darmio going.

That last part is a request, not a licence term. The code is plain MIT (see
`LICENSE`). For an agency licence, email alexbeltechi@gmail.com. The name
"Darmio" has its own short policy: `TRADEMARK.md`. To help build it, see
`CONTRIBUTING.md`.

## For developers

A headless CMS (posts, pages, a media and documents library, a content API)
with an optional site built on the Parabola design system
(`packages/parabola`). Next.js, MongoDB, Vercel Blob.

**Run it locally:** `npm install` (Node 20 or newer), copy `.env.example` to
`.env.local` and fill it in, `npm run dev`, then open
`http://localhost:3010/admin/setup?code=<SETUP_CODE>`. More in the last
section of `INSTALL.md`.

**Read first:** `docs/conventions.md` (the one way to do each common job)
and `packages/parabola/README.md` (the design system).

**Installs:** a maker's site is an install, their own copy of this repo with
their own database and keys. Installs pull updates from here. Customise
through settings, themes and blocks rather than code, and updates stay easy
to take.
