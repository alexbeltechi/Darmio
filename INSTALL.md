# Install Dharmify (for an AI)

You're setting up Dharmify, an open-source publishing platform, for its
owner. They may not be technical. The goal: their own Dharmify **online**,
at a web address they can open anywhere, and them signed in to it. Don't
set it up on their computer first and don't talk about localhost: the
first address they see is their live site.

Talk plainly. Say what you're doing in a line before each step, and ask
only for what only they can do (sign up, sign in, click a button in a site
you can't reach). Ask before anything that costs money; everything below
fits free plans.

## What they'll need

Three free accounts. They create each one themselves when you get there:
GitHub (their copy of the code), Vercel (where the site runs), MongoDB
Atlas (the database; Vercel can create it for them).

## 1. Their copy

Fork `alexbeltechi/dharmify` into their GitHub account, so updates can
come in later (GitHub's "Sync fork"). With the GitHub CLI:
`gh repo fork alexbeltechi/dharmify --clone`, after `gh auth login` if
needed. Without it, send them to the repo page to click **Fork**.

If GitHub won't fork it (they own Dharmify's repo, or can't fork it):
clone Dharmify, create a new private repo of theirs
(`gh repo create <name> --private`), point the clone's `origin` at it and
push `main`, and keep Dharmify as `upstream`
(`git remote add upstream https://github.com/alexbeltechi/dharmify.git`),
so updates still come in with `git pull upstream main`.

## 2. The site on Vercel

Create a Vercel project from their fork: on vercel.com, **Add New →
Project → Import** the fork; or with the CLI in the clone, `npx vercel
link` (they sign in when it asks) and `npx vercel git connect`. Don't
deploy yet: it needs its settings first.

## 3. Database and image storage

In the Vercel project's **Storage** tab:

- **Add MongoDB Atlas** (free). It sets `MONGODB_URI` for the project.
  If Atlas isn't offered there, they create a free cluster at
  mongodb.com/atlas: a database user, network access from anywhere
  (`0.0.0.0/0`, because Vercel's servers change address), and the
  connection string. Either way the string must name a database in its
  path (`…mongodb.net/dharmify?…`); add it as `MONGODB_URI`.
- **Add Blob** and connect it to the project. It sets
  `BLOB_READ_WRITE_TOKEN`, for uploaded images.

## 4. Keys and the setup code

Generate three values, each with
`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`,
and add them to the project's Production environment, for example
`printf %s "<value>" | npx vercel env add NEXTAUTH_SECRET production`:

- `NEXTAUTH_SECRET`: signs their sign-in.
- `CMS_AGENT_TOKEN`: lets an AI use the site's API later.
- `SETUP_CODE`: the one-time code in the setup link. Without it nobody
  can create the first account, so a stranger who finds the new site
  first can't claim it.

Also add `NEXTAUTH_URL`: the site's address, `https://<project>.vercel.app`
(or their own domain later). Never repeat a key in the chat; the setup
code is the one exception, inside the link in step 6.

## 5. Put it online

Deploy production: `npx vercel --prod`, or push to the fork's `main`.
When it's live, `GET <address>/api/setup` answers
`{ "needed": true, "hasCode": true }`. If `hasCode` is false, the
`SETUP_CODE` didn't reach Production: fix it and redeploy.

## 6. Hand over

Give them one link: `<address>/admin/setup?code=<SETUP_CODE>`. Call it
their setup link; don't explain the code inside it. Tell them to open it,
choose their email and password **there** (never in this chat), and name
their projects. If they lose it, give it to them again. After that, their admin is
`<address>/admin`: tell them to bookmark it.

That's the setup done. For work on their site afterwards, pull its
settings into the clone (`npx vercel env pull .env.local`) and read
`GET <address>/api/admin/agent` with `Authorization: Bearer
<CMS_AGENT_TOKEN>`: it explains the rest.

## If something goes wrong

Say what failed in one line and what you'll do about it. Common ones: the
database string without a database name; Atlas network access not open
to Vercel; a key added to Preview instead of Production; `NEXTAUTH_URL`
not matching the address they use.

## Running it on a computer (developers)

`npm install` (Node 20 or newer), copy `.env.example` to `.env.local` and
fill it in (any MongoDB, a `SETUP_CODE` of 16+ characters), `npm run dev`,
then open `http://localhost:3010/admin/setup?code=<SETUP_CODE>`.
