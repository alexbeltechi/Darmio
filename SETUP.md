# Set up Dharmify (for an AI)

You're helping someone set up Dharmify, an open-source publishing platform,
on their own computer or deployment. Work through the steps in order. Ask
before anything that costs money or creates an online account for them.

## 1. Get it running

Skip what's already done (a `.env.local` exists, the server answers).

1. Node 20 or newer. Then, in this folder: `npm install`.
2. Copy `.env.example` to `.env.local` and fill in:
   - `MONGODB_URI`: a MongoDB connection string with a database name in its
     path (`…/dharmify`). Ask the owner for one. If they have none, a free
     MongoDB Atlas cluster works: walk them through creating it; they sign
     up themselves.
   - `NEXTAUTH_SECRET` and `CMS_AGENT_TOKEN`: generate each with
     `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - `NEXTAUTH_URL`: where it runs, `http://localhost:3010` on their computer.
   - Leave `BLOB_READ_WRITE_TOKEN` empty locally: uploads go to `public/uploads/`.

   Write secrets into the file; never repeat them in the chat.
3. `npm run dev`, then use `http://localhost:3010` as the address below (or
   the deployment's address, if they deployed it).

## 2. Is setup still needed?

`GET <address>/api/setup` returns `{ "data": { "needed": true|false } }`.
If `needed` is false, it's already set up: send them to `<address>/admin`
to sign in, and stop.

## 3. Ask the owner

- Their email: it's how they sign in.
- A password, at least 8 characters. Let them choose it; never make one up.
  If they'd rather not type it into this chat, stop here and send them to
  `<address>/admin`, where the setup page asks for it.
- Their projects: a name for each (a site, a newsletter, a brand) and, if
  they have one, a brain for it (a folder or link with what an AI should
  know first). One is enough; they can add more later.

## 4. Create the account and projects

```
POST <address>/api/setup
Content-Type: application/json

{ "email": "…", "password": "…", "projects": [{ "name": "…", "brain": "optional" }] }
```

It answers `201` when done, `400` with a reason to fix, or `409` if someone
set it up meanwhile. It only works while the install has no account.

## 5. Hand over

Tell them to open `<address>/admin` and sign in with their email (a setup
page they left open moves on by itself). For anything after that, read
`GET <address>/api/admin/agent` with `Authorization: Bearer <CMS_AGENT_TOKEN>`:
it explains the rest of the API for the project they're in.
