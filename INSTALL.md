# Install Dharmify (for an AI)

You're setting up Dharmify, an open-source publishing platform, for its
owner. They may not be technical. The goal: their own Dharmify **online**,
at a web address they can open anywhere, and them signed in to it. Don't
set it up on their computer first and don't talk about localhost: the
first address they see is their live site.

Talk plainly. Say what you're doing in a line before each step. Do
everything you can yourself; ask them only for what only they can do (sign
up, sign in, click in a site you can't reach). Ask before anything that
costs money; everything below fits free plans.

## How to guide them through a click step

Assume they've never seen the site you're sending them to. Each time:

1. **What and why, in one line.** "Vercel is where your site will live."
   "The database is where your posts and settings are kept."
2. **The link** to open, as directly as you can.
3. **The clicks, numbered,** with the exact words on the buttons, one action
   per line. Labels can change: say what to look for, not only the label.
4. **What they'll see when it worked.**
5. **"Tell me if anything looks different,"** and help from what they
   describe. Offer more explanation; don't front-load it.

Then **check it yourself** instead of asking whether they did it (each step
says how), and say what you found.

**Ask before creating anything in their accounts,** even when their tools
are already signed in and you could just do it. Say what and where, and
wait for a yes: "I'll create a private repo called `my-site` in your
GitHub account `their-name`, and a Vercel project with the same name.
OK?" Use the name they choose.

## What they'll need

Three free accounts. They create each one themselves when you get there:
GitHub (their copy of the code), Vercel (where the site runs), MongoDB
Atlas (the database; Vercel creates it for them). GitHub isn't optional:
Vercel builds the site from it, and Dharmify's updates reach them through
it.

## 1. Their copy

Tell them: "GitHub keeps your own copy of Dharmify's code. Your site is
built from it, and updates come in through it."

**Signed in?** Check with `gh auth status` (the GitHub command-line tool;
if it's missing, ask before installing it, for example `brew install gh`
on a Mac). If it names an account, tell them which, and ask before
creating anything (see above). If not:

- **No GitHub account yet:** send them to github.com/signup: an email, a
  password, a username (it appears in their copy's address), then the
  code GitHub emails them. Free plan.
- **Sign the tool in:** run `gh auth login` and walk them through it:
  choose **GitHub.com**, then **HTTPS**, then **Login with a web
  browser**. It shows a one-time code: they copy it and press Enter; a
  browser page opens (github.com/login/device), they paste the code and
  click **Authorize**. Check with `gh auth status`.

**Then make the copy.**

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

Check: `gh repo view <their-name>/<repo>` shows their copy. Tell them its
address.

## 2. The site on Vercel

Vercel is where the site runs. **Signed in?** `npx vercel whoami` names
the account: tell them which, and ask before creating the project. If
not, `npx vercel login` and they choose **Continue with GitHub** in the
browser page it opens (that also creates their Vercel account if they
have none; free Hobby plan).

Create a Vercel project from their copy. With the CLI in the clone: `npx vercel link` (it opens a browser for them
to sign in or sign up: say so first) and `npx vercel git connect`. Without
the CLI, walk them through it:

1. Open vercel.com and sign up or log in, choosing **Continue with GitHub**.
2. Click **Add New…**, then **Project**.
3. Find their copy of Dharmify in the list and click **Import**.
4. Leave the settings as they are (the repo's `vercel.json` tells Vercel
   it's a Next.js site). Don't click **Deploy** yet: tell them it needs
   its settings first, and stop at that screen.

A push to the copy's `main` deploys by itself once the project is
connected. A deploy before step 4 fails for lack of settings; that's
expected, and the deploy in step 5 fixes it.

Check: `npx vercel project ls` lists the project.

## 3. Database and image storage

Both are added from the project's **Storage** tab on Vercel, so they don't
need another account. Tell them: "Your site needs two things: a database,
where your posts and settings live, and storage for your images. Vercel
can create both for you. Here's how."

The database (MongoDB Atlas, free):

1. Open vercel.com, click the project, then **Storage** in the menu along
   the top.
2. Click **Create Database** (or **Connect Database**).
3. Choose **MongoDB Atlas**. If Vercel asks them to accept terms or
   create a MongoDB account through Vercel, that's expected: accept.
4. Pick the **free** plan, a region close to them, and **Create**.
5. When it asks which environments to connect, keep **Production**
   (and **Preview**) ticked, then **Connect**.

They'll see the database listed in the Storage tab. If MongoDB Atlas isn't
offered there, they create a free cluster at mongodb.com/atlas instead:
walk them through a database user, network access from anywhere
(`0.0.0.0/0`, because Vercel's servers change address), and copying the
connection string; you add it as `MONGODB_URI`.

The images (Vercel Blob):

1. Same **Storage** tab, **Create Database** again.
2. Choose **Blob**, give it any name (the site's name is fine), **Create**.
3. Connect it to the project, **Production** ticked.

Check: `npx vercel env ls production` lists `MONGODB_URI`, and either
`BLOB_STORE_ID` (newer Blob connections: Vercel signs the site in to
Blob by itself) or `BLOB_READ_WRITE_TOKEN` (older ones). Then add `MONGODB_DB` = `dharmify` to
Production: the integration's connection string usually names no
database, and you don't edit the string itself (Vercel manages it).

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

Say what failed in one line and what you'll do about it. Common ones: every page "not
found" (the copy lacks `vercel.json`: pull Dharmify's latest); images
failing with "Image storage isn't connected" (no Blob store connected to
Production); `MONGODB_DB`
missing (the site then uses a database called `test`); Atlas network access not open
to Vercel; a key added to Preview instead of Production; `NEXTAUTH_URL`
not matching the address they use.

## Running it on a computer (developers)

`npm install` (Node 20 or newer), copy `.env.example` to `.env.local` and
fill it in (any MongoDB, a `SETUP_CODE` of 16+ characters), `npm run dev`,
then open `http://localhost:3010/admin/setup?code=<SETUP_CODE>`.
