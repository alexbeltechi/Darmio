---
reviewed: 2026-10-29
owner: Alex
---

# Decisions

Calls Alex has made, so they don't get reopened. Newest first. One line each,
with the why. To change one, add a new line that overrides it.

## Product

- 2026-10-28 — **One top bar, solid by default.** Every admin page and
  /parabola pin the same bar (`DsTopBar`, Parabola, Layout › Top bar):
  compact rows (12px above and below), solid in the page colour with a rule
  under it. It can also be transparent, or blur (the nav fade the admin
  used until now). Fields are solid too, in the page's own colour, so they
  read as places to type on a card; info cards take the default button's
  see-through surface, so they show on a card as well (Alex). The panel's
  sections are a Parabola accordion (`DsAccordion`, Layout › Accordion,
  32px headers, what's under each set in 16px), and each colour is one
  nested inside Colours; the top bar's Collapse all / Expand all folds or opens them all. The site's own nav is unchanged for now.
- 2026-10-28 — **Parabola themes, made like shadcn's create page.** A
  theme is data (`packages/parabola/theme.ts`): five colours
  (`colours.ts`), each based on the one before until given its own: the
  **primary colour** (was "theme colour") (the website's background; Parabola's own is white, its
  cards a warm off-white #F7F5F2, 4 darker, the same step a picked primary
  colour's cards take (paper, #FAF7EF, for a day on 2026-10-28; Alex wanted
  white back, 2026-10-29); every picker
  has a warmth bar, cold to warm, between hue and brightness), the
  **surface** (cards, side panels, fields; based on the primary colour, a
  bar sets how much lighter or darker, so the contrast between page and
  cards is a choice; Alex, 2026-10-28), the **secondary colour** (was
  "typography")
  (the text, and the quiet text, borders and shades drawn from it;
  Parabola's is black or white, whichever reads on the theme colour),
  **buttons** (solid buttons and selected states: the current nav item, a
  pressed button, a checked box, the Published pill, with black or white
  on them; "Based on secondary colour" by default; Alex, 2026-10-28) and
  the **accent colour** (the one highlight; "Based on buttons" by default,
  so Parabola's own highlight is black, white in dark, no longer purple,
  the admin's included; Alex, 2026-10-28). Selected states (the current nav
  item, a pressed button, a checked box) are the text colour, solid, as
  Publish is. In the panel the five are points on **one colour wheel**
  (`DsColourWheel`; Alex, 2026-10-29, after a grading tool's wheels): a
  point's angle is its hue, its distance from the centre its saturation;
  the arc on the left is the chosen point's saturation, on the right its
  brightness. A colour of its own is a solid dot, one still based on
  another a faint one; drag any point to make it yours. Hovering the disc
  shows a plus: a click there gives the next based colour its own, where
  you clicked, so the more you add, the more of the theme you set. Under
  the wheel the chosen colour's hex and the five in a list, each with a
  way back to what it's based on. No swatches or preset lists: for a
  different look you make another theme (Alex, 2026-10-28). Each is picked
  for light; in dark it's based on the light one until given a dark
  colour of its own. **Dark is a dark version, not a flip** (Alex,
  2026-10-29): the page and cards keep their hue and colour and are about
  90% dark (the page at most 8% bright, cards a step above), however light
  or dark the light theme is, and a light page darker than that stays as
  it is; paper becomes a warm charcoal. Text, buttons and the accent keep
  their hue and richness and move only as far as they need to read on the
  dark page (a red stays a red, a navy a blue; Alex, 2026-10-28). Until
  2026-10-29 each colour was its own picker with a brightness bar, and a
  light colour's dark one was its opposite (a dark page went pale). Since text and surfaces come from the same two
  colours, text on a card reads as it does on the page; **font families**,
  Font (text) and Heading (headlines) to start and any more you add, each
  a name and a font; the fonts it can use, Parabola's (Instrument Sans,
  Instrument Serif, System) less any it took out, plus Google fonts added
  by name or link (a share link keeps the weights picked there); for each
  text style its name, family, weight (one its font has), size and line
  height (Display to H2 in Heading, Instrument Serif Regular; H3 and the
  rest in Font, Instrument Sans Medium); a **radius**, None, Medium,
  Large (the default) or Custom (pixels typed in; Small is no longer offered, an older theme's still reads), for every corner, cards, fields and buttons
  alike: buttons are fully round only because Large is the default
  (Alex, 2026-10-28); and an icon library (Lucide; the
  others shadcn offers need Parabola's icons in one place first). Themes
  live in a **library** in each project's settings: Parabola (Parabola's
  own, read-only: a change to it goes into Custom, the one working copy,
  made if there's none and its contents replaced if there is, never Custom
  2, 3…; Create theme, pinned at the panel's foot while Custom is open,
  makes it a theme of its own; Alex, 2026-10-28) and any added, one of
  them the site's. **Save** keeps the themes without touching the
  website; **Publish** saves and puts the open theme on the website (the
  site wears its own copy of the published theme, `publishedTheme`, so
  saving never changes it); a pick in Settings › Design publishes too. Only the website
  wears it, and on `/parabola` only the canvas (the open theme): the admin
  and `/parabola`'s sidebar, header and panel always wear Parabola's own,
  published or not, so a theme that breaks the site never breaks the tools
  to fix it (Alex, 2026-10-28). The panel's Light and Dark switch only the
  preview; the UI's own light or dark is the sidebar's toggle (system by
  default). In dark, text that's only based on the
  light one falls back to black or white if it wouldn't read.
  Publishing remakes the site's cached pages at once, and `/parabola`
  makes the themes of the project picked in the admin, the one it
  publishes to.
  `/parabola` opens on **Theme** ("Theme" over the open theme's name):
  a site's page in one 600px column wearing the open theme (its nav, a
  post's opening on the page itself, a subscribe card with the large
  buttons above the fold, a list of writing, a draft's card with its note,
  as a site and its admin lay them out; Alex, 2026-10-28),
  and the panel on the right (the theme as code last, folded: a full
  export a person or an AI can build a site from as it is, every colour by
  its role in light and dark, the fonts with a Google Fonts link, the type
  scale, the corners in pixels, and the settings, so pasting one back in
  applies it; `dsThemeExport`; Alex, 2026-10-28) (a rule between its
  sections, no line of explanation under its fields; under the top bar,
  which runs the full width with a rule under it) with its main choices (which
  theme: a dropdown whose last option is Add theme, and a ⋮ at the
  section header's right with Rename, Duplicate, Restore and Delete; light or dark; theme colour,
  typography, buttons, accent colour; Heading and Font; radius; icons), 400px wide, about a
  phone's width. The preview cards float on the canvas, with no frame
  around them. **Typography** has the
  rest: Font families (stacked cards, an edit dialog each, Add family; the
  fonts, linked to Google Fonts; Add font) and Type scale (an edit dialog
  per style). Top right on every page: **Undo**
  (icon and label) and **Redo** (icon), **Publish** (asks first, since it
  changes every site that uses one of the themes), and a ⋮ menu to restore
  defaults, asking first, with Undo in the toast (and each panel section,
  Colours, Type, Radius, Icons, has a ⋮ with Restore for its part): a page's part of the
  open theme, or all settings ("Restore all settings"), which goes back to Parabola (it opens, and
  is the site's again once published; other themes stay). Parabola reads
  "(default)" in the theme dropdown, no other theme does (Alex,
  2026-10-28). The type and colour
  tokens are `--ds-*` variables, so a theme changes them at run time. The
  CMS hosts Parabola's fonts with next/font, so a visitor's browser calls
  Google only for a font a theme added. Font and Heading, as shadcn names
  them (Alex, 2026-10-28; was Primary and Secondary, briefly Display).
  BEL-109; uploading a font file and an icon component come next. Why:
  anyone should be able to make a Parabola theme quickly and give each of
  their sites its own.
- 2026-10-28 — **A switch sits right after its label**, never pushed to the
  far edge of its row; nav rows are 4px apart (`ds-4`).
- 2026-10-28 — **The site's nav is a conventional bar** as wide as the
  reading column: the site's name on the left in H3, which is the way
  home (no Home button); the sections on the right as ghost buttons 4px
  apart, muted, with a light surface on hover and no highlight for the
  page you're on; then the theme switch as a ghost icon that flips to the
  other theme. No post counts. Phones keep the name and Explore.
  Overrides the centred pills with counts (Alex, after nicksaraev.com).
- 2026-10-28 — **The ghost button's hover is one light surface**
  (`ds-surface` at 40%, no darkening tint), the same as its current
  state; it was too dark in the light theme. Everywhere the text variant
  is used, admin included.
- 2026-10-28 — **Text reads at 600px** (was 661) on posts and pages, and
  **a square image fills its gallery**: a row may be as tall as the
  gallery is wide (was 70%). A gallery that shows one image a row (Auto up
  to three, Stacked) is the reading width, so pictures line up with the
  text; one with images side by side (Auto from four, grid, masonry,
  Inline) runs to 820px (was 1024), the tallest a row may be, so three
  across stay big enough to see. Alex's message lost the exact width;
  600px is the agent's pick, closer to Nick's column.
- 2026-10-28 — **Pages have a format, and a fresh install can start as
  Ilo's site.** Alex: an out-of-the-box site shaped like nicksaraev.com,
  presets of pages, "not a block editor". A page picks one of four
  formats (`lib/cms/page-formats.ts`) and fills it with its blocks, by
  hand or by agent: **Text** (a title, a line, the text in a reading
  column, the pages under it at the end), **Home** (an intro, then the
  latest posts of one category, each page with pages under it, each links
  page and a newsletter, all made from the rest of the site, so nothing is
  typed twice), **Links** (a title and links with a note each), and
  **Blocks** (what every page was before; a page without a format is
  this). A page can sit under one top-level page (My story, Press kit
  and FAQ under About), and a top-level page can be in the nav, after the
  categories. A page at `home` is the homepage. Home's sections list in
  the body copy's size, each ending in a link to its page ("All 6 posts",
  "Learn more about me"). A category's page gains a **list** layout: its
  posts stacked like a blog, left-aligned: the picture or video when there
  is one, the title in the home lists' size, the start of the text, and a
  row with the post's own categories (links) and its date. New page offers presets (Home, About, My story, Press
  kit, FAQ, Follow, Work with me), each a starting text that says what
  goes there. The example site is
  Ilo's: `npm run seed -- ilo` loads Writing (six essays), Home, About and
  the three pages under it, Work with me and Follow, with three Y3K images
  and a loop of her (Alex: "we can use one of the Y3K images"), all marked as
  examples. Overrides 2026-10-24's seed in part: no Moments category,
  since Alex's list didn't have one, and Follow instead of Elsewhere. The
  list of links (label left, note right, a "more" link at the end) is
  Parabola's `DsLinkList`, which Alex liked; the page title and section
  heading stay with the site's pages.

- 2026-10-28 — **Three Darmios: self-hosted (free, MIT), the web version
  (paid, later), and themes (sold).** Replaces 2026-10-07's "no paid
  tiers" and the never-merged 2026-10-27 "no hosted plan".
  **Self-hosted** is the whole CMS, free under MIT, on the maker's own
  Vercel, database and storage, with their own agent: nothing it needs runs
  on a server of ours, so it costs us nothing per user (MCP traffic, the
  activity log, a pasted key all stay between the maker, their site and
  their agent). **The web version** is a separate paid app, like Ghost(Pro)
  or Polsia: we host it and our agent works on it; the comfort of starting
  without a terminal, our skills and our themes, not a lock. Our agent
  only, no bring-your-own key. It is not built or announced before the
  2026-11-25 release, which is the open-source version alone, "open source
  under MIT, run it yourself". **Themes** come from us and from other
  designers on commission, and every one works on both versions.
  Rules that keep it honest: *paid is what costs us money or time (hosting,
  our agent's tokens, design); code is never paid, and no feature moves
  from free to paid.* The web version runs released public code, so the
  repo is never behind it; its private code is only billing, accounts and
  the agent runtime. Export is always there, never behind a paywall: one
  file with a project's content, settings and agent documents, plus its
  media, that any Darmio imports, and from the web version a self-hosted
  copy of your exact site, code and theme included, ready to deploy. The
  content schema is versioned from now so imports survive drift.
  Legally, Ghost's shape: the LICENSE file is plain MIT; "Darmio" is
  Alex's trademark with a short policy (others may host the code, nobody
  else gets to be Darmio); contributors sign a CLA so the project stays
  free to change course. No promise of "forever": MIT already lets anyone
  keep what they have, and maintaining it is ours to stop one day. A
  fair-use ask, not a licence term, in the README and on darmio.io:
  "Darmio is MIT. Use it however you like. If you run it for clients on
  more than 5 projects, please buy an agency licence. It keeps Darmio
  going." One-off, perpetual, unlimited, unenforced. Why: Alex wants to
  earn from the web version and from taste without betraying the people
  who download the free one, and to be able to leave, as Polsia's users
  can't. Tickets BEL-112, BEL-113, BEL-114.
- 2026-10-28 — **Any agent, through MCP; the admin shows what it did.**
  The self-hosted admin never locks to one agent: Claude Code, Claude
  Desktop, Cursor, an agent in Slack, anything that speaks MCP works on the
  site through its connector (BEL-111), and the admin shows every change
  with a short summary each agent leaves at the end of a session. Chatting
  to an agent inside the admin (our agent on the web version; a pasted key
  on self-hosted, maybe, one day) and a web chat that drives a local agent
  are later, and the latter only ever through the maker's own site, never
  a bridge of ours. Why: transparency without cost to us, and no agent
  lock-in.
- 2026-10-27 — **Usage bars split by project.** Parabola's `DsProgress` takes
  `segments`: parts of the fill side by side, each in one of Parabola's
  accents in a fixed order (blue, orange, green, violet, pink, teal, sky,
  stone, red), with a legend. Settings' Database and Image storage bars show
  each project's share; a project keeps its colour everywhere (its place in
  the project list), and its own Library section shows its share in that
  colour against the others in grey.
- 2026-10-27 — **Home › Settings shows what the install runs on.** After
  you (account, password): Hosting (Vercel, its address, the repo it
  deploys from), Database (the MongoDB cluster, how much the projects use
  against Atlas's free 512 MB, per project) and Image storage (Vercel Blob,
  the same against its free 1 GB, per project), each with a link to where
  the plan is set. All three are set up once for the install and shared by
  every project; the free tiers aren't split per project. A site can't see
  its own plan, so the bars measure against the free tiers and say so. A
  project's Library section keeps the image quality and shows that
  project's share, linking to the whole.
- 2026-10-27 — **A project card has a ⋮ menu**, the same as a post row:
  Settings, Rename (a dialog with the name; it renames the site too), and
  Delete project, which removes its library's files, its content and its
  place in the list for good, after a confirm where you type "delete". Any
  project can go, so you can start over: deleting the one the site shows
  makes the next one the site (the dialog says which), and the hub keeps the
  accounts. Projects are emptied collection by collection, because Vercel's
  database users can't drop whole databases. The header's button reads
  + Project, like + Post.
- 2026-10-26 — **The CMS is Darmio** (darmio.io), was Dharmify. The repo is
  `alexbeltechi/darmio`, the folder `~/Documents/Code/products/darmio`, and
  the name runs through the code (the `darmio-project` cookie, the
  `x-darmio-project` header, `darmio` as the suggested database). Parabola
  keeps its name. Figma references still say "Folio Dharmify" until the
  Figma file is renamed.
- 2026-10-26 — **Parabola's text buttons hover like a default button** (its surface plus the hover tint, so it shows even on a hovered card), and take the same padding to make room for it; text links that must line up with a field pull back with a negative margin.
- 2026-10-26 — **A project's database name fits in 38 bytes,** MongoDB Atlas's limit (found when a long project name failed): the hub's name and the slug, cut short with a bit of the project's id when needed. The database is made before the project is listed, and a project whose database can't be read still lists.
- 2026-10-26 — Library's icon is an image, though it holds documents too: it reads as the pictures.
- 2026-10-26 — **Your Settings are two cards,** like a project's: Account
  (name, and the email you sign in with) and Password. Changing the email
  asks for your password instead of a confirmation email, since Darmio
  can't send email yet; the field says so. Confirmation by email comes
  with email.
- 2026-10-26 — Sign-in is titled **Sign in to Darmio**, so you know where you are; setup, **Set up Darmio**.
- 2026-10-26 — **A forgotten password is a one-time link from your AI.**
  Darmio can't send email yet. Sign-in has a quiet "Forgot your
  password?" that opens in place: "Email isn't set up for this site yet.
  You can reset it manually by code or through AI:" over a prompt for the
  AI that installed the site. The AI runs `npm run reset-link`,
  which makes a link that works once, for an hour (only its hash is
  stored, in the hub); the owner chooses the new password on the site at
  `/admin/reset`, never in the chat, and is signed in. `npm run
  reset-password` stays for developers. Email resets come with email.
- 2026-10-26 — **Home is Framer's dashboard.** Home pages (all projects,
  New project, your Settings) get their own full sidebar instead of the
  rail, with just Projects and Settings; at the foot, Sign out as a plain
  button (not one more place to go) with the theme beside it. The projects
  themselves are the cards beside it, so the sidebar doesn't list them. A
  small "Home" label sits 8px over Projects. The main area shows the
  projects as cards with no thumbnails or icons: the name with a Published
  or Not published pill beside it (a long name wraps and the pill follows),
  then at the bottom the address when it's published and "Changed 6 minutes
  ago" (the date after a week), with the gear at the bottom right; with
  a search and New project at the top right, and one centred line when
  there are none or none match. Projects and New project carry no icons in
  any menu. Settings there (`/admin/account`, a gear) is yours across the
  install: name and password. Creating a project returns to Home, where its card appears;
  you open it from there. Inside a project the rail keeps its transparent
  Home button, a plain link to Home (no menu: Home shows every project); the
  avatar at its foot still opens Settings and Sign out. On phones the
  project name in the menu still opens a projects menu. Signing in and setting up land on Home; opening a project goes
  to its posts. Overrides the same day's Home page with rows.
- 2026-10-26 — **Without a working setup link, setup is a page, not a
  form:** "Set up Darmio", then "This site isn't set up yet. Paste this
  into the AI that installed it:" over a prompt that asks that AI for the link (it carries
  the site's address). No "if it's yours": a stranger can't use the prompt. A wrong link adds "That setup link
  didn't work." The paste-your-link field is gone: whoever has the link
  just opens it.
- 2026-10-26 — **The project is at the top of the rail, you are at the
  foot,** the way Slack splits a workspace from its user. The project's
  tile (its initial on a solid square, a chevron on hover) opens the
  projects, the current one ticked and each with a gear for its settings,
  then New project. View site, Account and Sign out left that menu. A round
  avatar at the foot opens your email, Account (a page of its own: you are
  the whole install's, not a project's) and Sign out. The rail's gear is
  the current project's settings, which show where its site is live and
  hold its brain. New project asks for a name only, then switches to it.
  No Figma-style home screen until people run many projects. Overrides the
  2026-10-24 project menu.
- 2026-10-26 — **Setup is the account only.** The setup link asks for
  email and password, then creates the account and a first project ("My
  site") and opens the admin. Projects are added later from the menu
  behind the letter (wayfinding cards to point there: Alex designs them
  later). The site's name and its project's name are one: renaming the
  site in Settings › Project renames the project. Overrides the same day's
  projects-as-tabs step. The README and the AI's hand-over say the admin
  is always at `/admin`; the AI narrates every action it takes, what and
  why, before and after.
- 2026-10-26 — From the first fresh install: the repo carries
  `vercel.json` (`framework: nextjs`), so a Vercel project created before
  the code arrived still builds as Next.js; Blob works with either
  connection Vercel makes (`BLOB_STORE_ID` with Vercel's own sign-in, from
  `@vercel/blob` 2.8, or the older `BLOB_READ_WRITE_TOKEN`); on Vercel
  without either, uploads fail with a plain message instead of a disk
  error.
- 2026-10-26 — **Installing is one prompt to your AI.** The README opens
  with it; `INSTALL.md` is the one install guide, written for an AI: fork
  the repo, a Vercel project, MongoDB Atlas and Blob from Vercel's Storage
  tab, the keys and a one-time `SETUP_CODE`, deploy, then hand the owner a
  single link to the live site's setup (`/admin/setup?code=…`), where they
  choose their own email and password. Online from the start: no local
  install first, no localhost for the maker. No npx package, start page,
  hosting picker or deploy button yet; those come if testers get stuck.
  Setup refuses without the code, which closes "whoever visits first
  claims it". Developers run it locally from the same file's last section.

- 2026-10-26 — **An account is an email.** Setup asks only for email and
  password; a name is optional, added under Settings › Account. Accounts
  belong to the install, not a project, so more people with roles (a
  simple Figma-like owner and editor) can come later without changing this.
- 2026-10-26 — **Sign in with email and password**, no usernames. Overrides
  2026-10-24's "username and password". Passwords are stored only as bcrypt
  hashes (cost 12) in the install's hub database; nothing is generated and
  nothing is kept in the browser. Five wrong passwords for an email in 15
  minutes lock it for 15 minutes; twenty from one address too
  (`login_attempts` in the hub, kept across server instances); a correct
  sign-in clears the email's count. An unknown email answers and takes as
  long as a wrong password. Next, in order: a one-time **setup code** the
  deploy creates (so nobody who reaches a fresh install first can claim
  it; must land before the Deploy button), password reset by email once an
  install can send email, and **Google sign-in** as an option for installs
  that add their own Google keys.

- 2026-10-26 — **Onboarding is steps on the page, no window**: start (set it
  up here, or hand it to your agent with a prompt to paste), then *you* (name,
  username, password: global, for the whole install), then *your projects*
  as tabs (a name each and an optional brain). Nothing is saved until the
  last step. "Project", not "site": a project can be a site, a newsletter, a
  brand. A project's **brain** is a folder or link an agent reads before
  working on it; the agent guide names it.

- 2026-10-26 — **A fresh install is a blank slate.** Nothing about one site
  is in code. A site's sections are its top-level categories: each has a
  page, and is in the nav unless switched off, so the nav grows as sections
  are added. A category can sit inside one top-level category (one level),
  and rolls up into its page. A top-level category carries its page's
  headline and layout (`CATEGORY_LAYOUTS`). The home headline and its button
  are in Settings › Site; without one the homepage is just the posts. An
  install with no users opens `/admin/setup` (name the site, make the
  owner); `/api/setup` only works while there are no users.

- 2026-10-26 — The CMS is called **Darmio CMS** (Alex, 2026-10-25, in his
  brain; working title since 2026-10-21). **Parabola** stays the design
  system's name and nothing else, which settles 2026-10-04's idea of
  calling the whole project Parabola. The repo keeps `beltechi-cms` until
  Alex renames it. beltechi.com is on Framer today and moves onto Darmio
  at the pre-release, 2026-11-25.

- 2026-10-24 — The example site a fresh install ships with is **Ilo
  Odena**, one of the Humans of Y3K (dragonfly-wing glasses; she made
  Hollow in cohort 02). She writes and keeps **moments**, a few seconds of
  light with whatever else was in the air, which her glasses keep; the site
  never explains how, or when she lives. Categories Writing and Moments,
  not Photography. Y3K Club appears plainly in About and Elsewhere, never
  as an ad. Why: a seed that makes a maker think "I want a site like this",
  and a soft way into Y3K.
- 2026-10-24 — The V0 is a **second clone of this repo with its own
  database**, not a fork or a copied folder: beltechi.com and the release
  are the same code with different data, so a fix lands once.

- 2026-10-24 — All of Alex's brands (beltechi.com, Y3K Club, Basaki…) run
  on **one deployment, switched from the admin**: projects, as in Figma or
  Slack. Each project is its own database and media store; a hub holds only
  the wiring (name, domains, encrypted connection string, store, agent
  token). No memberships: everyone with an account on an install sees all
  its projects, and testers run their own install. Why: one login and one
  admin without hosting other people's data or sharing one free tier.
- 2026-10-24 — Out of the box the site is posts and one feed. There is no
  nav until a category is marked for it or a page is published; the feed
  sizes itself like a gallery. Seed content ships as examples (photos we
  own), marked as such and removed in one action.
- 2026-10-24 — Auth stays a username and password, kept simple: change it
  under Settings › Account; locked out, `npm run reset-password` against the
  database. No email reset until the CMS has an email provider (the
  newsletter mission brings one).
- 2026-10-24 — **Custom code pages**: a page kind whose body is a component
  committed to the repo, visible and deletable in the admin like docs. A
  named exception to "taste lives in the blocks" and "minimal dependencies",
  for one-off editorial pages (a three.js case study) that shouldn't become
  system blocks.

- 2026-10-20 — Top-level groups: Design (design, brand, product),
  Photography (photography, portrait, still-life, fashion, wedding, travel,
  garments, lifestyle), Journal (journal only), and Bikes (bikes), a group of
  its own that isn't in the nav yet. Lifestyle moved from Journal to
  Photography and Bikes left Journal: those posts are photography and bikes,
  not journal entries. A post page's "More" grid shows posts that share its
  sub-category first, then the rest of its group, never another group.
- 2026-10-07 — Open source first; no paid tiers. Alex doesn't want to run a
  subscription business.
- 2026-10-07 — Photography and art go up before design work.
- 2026-10-04 — No public pricing anywhere on the site. Sprints first, then
  long-term contracting, then y3k.club.
- 2026-10-04 — Every Markdown file an agent stores is visible, attributed and
  deletable in the admin. Nothing hidden on Alex's servers.
- 2026-10-04 — Agent first, UI as backup; manual edits never need an agent.
- 2026-10-04 — Taste lives in the blocks. Alex designs every block; agents
  compose pages and propose gaps but don't invent blocks alone.

## Design

- 2026-10-26 — **Phones: fields full width, buttons their own width.**
  Below 1024px (where the admin switches to its phone layout) fields fill
  the row; from 1024px they take the standard 320px. Buttons never stretch
  unless pinned to the bottom of the screen. Overrides the field-width
  token's note that 320px needed no second size on phones.
- 2026-10-26 — **Empty states are one line and an optional button,**
  centred both ways in the section (`DsEmptyState`), in every section,
  admin and public site alike (an empty page centres it in the page).
  Side notes go in an info card (`DsInfoCard`).
- 2026-10-26 — The onboarding opens straight on its first step, titled by
  the step ("Set up Darmio", then "Your projects"), with no outline;
  doing it with an AI is an info card with a prompt to copy (it points at
  `INSTALL.md`), not a choice up front. Refines the same day's onboarding
  decision.

- 2026-10-24 — **Fields have one standard width**, 320px
  (`--ds-field-width`), set by Parabola: a field dropped on a page is
  already that size, and what `/parabola` shows is what a page gets. Forms
  lay fields out left-aligned in a row that wraps (`DS_FIELDS_CLASS`),
  never stretched to fill it. Only a field that holds long text or a list
  (a document's contents, attached files, share toggles) fills its row
  (`w-full`); search bars in toolbars fill theirs. Containers one field
  wide (dialogs, side panels, the sign-in card) make fields fill them
  (`ds-fields-fill`). Why: Alex didn't want fields stretched left and
  right, with short and long ones side by side; 320px is a phone's width,
  so one size works everywhere.
- 2026-10-24 — **Media is the Library**, and documents live in it: images,
  video and documents in one place, with documents as one more type in its
  type filter (Library › Documents). Agent-made documents say "By your
  agent". There is no Agent section; the rules agents read (documents of
  kind guide) are listed under Settings › Agent. Admin URLs move
  (`/admin/library`, `/admin/library/documents/<id>`) with no redirects, as
  on 2026-10-20; the API paths (`/api/admin/media`, `/api/admin/docs`) stay.
- 2026-10-24 — Settings are grouped by what they're about, in setup order:
  Site, Library, Integrations, Agent, Account. A layout is a setting of the
  page it shapes, so the homepage layout setting is gone (it no longer did
  anything). The activity list, collections, storage and API endpoint
  panels are gone from Settings: they were reference, not settings. The
  activity log is still written, for agents and a later per-post history.
  "Source line" is now **Original post link**, and every integration's name
  links out to the account it's connected to.

- 2026-10-24 — The admin rail's mark is the project's initial, from its site
  name, and opens the **project menu** (the projects, add a project, view
  site, account, sign out), the way Figma's logo does. The B was Alex's.

- 2026-10-20 — The Classic gallery layout (rows of one, then two) is
  replaced by **Stacked**: one image a row, each as large as it may be
  (same sizing as Auto), whatever the count. Gallery layouts are Auto,
  Stacked, Grid and Masonry; a gallery without a layout shows as Auto.
- 2026-10-20 — Galleries size themselves by how many images they hold.
  Width `auto` (the default) keeps a gallery inline (at most 1024px):
  1 to 3 images stack, one large image a row, as a focus section; 4 to 19
  go three a row (two on a phone). From 20 images, about four rows on a
  laptop, it runs the page's whole width in rows of at most 2/3/4/5/6/7 as
  the gallery passes 640/1024/1280/1680/2200px. To alternate focus and
  overview, use several gallery blocks. `large` (always inline) and `full`
  (always full width) override it. Every row fills the width unless that
  would enlarge an image past its own pixels or pass the row height limit
  (70% of the width on desktop, 820px at most); then it stops and sits
  centred. Overrides 2026-10-08's 1280px inline width and target-height
  rows. Why: fill the screen in a way that looks considered, without
  choosing a layout per gallery.
- 2026-10-20 — Spacing is a Parabola foundation: seven distances named by
  their size, 4, 8, 16, 20, 40, 80 and 160 (no 24, no second 80), as
  `--ds-space-*` tokens with `gap-ds-20` / `pt-ds-160` utilities, shown at
  `/parabola/spacing/scale` with what each is typically for, and mirrored
  in `spacing.ts` for layouts that do arithmetic. Every gallery and grid
  uses 20 (the gutter), across and down. Names are sizes, not roles,
  because roles read as arbitrary and two roles shared one value.
  Why: the same gap should mean the same thing on every page.
- 2026-10-08 — New galleries default to the **Auto** layout: justified rows
  that read left to right, each image at its own shape, every full row
  filling the width, like techistack's contact sheets (without their edge
  text). One or two images, or a short last row, sit centred. Existing
  galleries were moved to Auto too (2026-10-08, `scripts/migrate-gallery-layout-auto.ts`);
  no size limits on what Auto takes.
- 2026-10-07 — Parabola first. shadcn/ui is a fallback only when Parabola
  lacks something; wrap it as a Parabola component rather than using it raw.
- 2026-10-04 — Figma sketches are concepts: take structure and intent, not
  the literal look. Parabola type tokens only; copy is never in a card.
- 2026-10-04 — Given an md for a page: attach it as-is, then build the page
  and wireframe in one go. Questions come after Alex sees the wireframe.
- 2026-10-04 — Wireframes are built from the real Parabola components, never a
  hand-written CSS kit.

## Engineering

- 2026-10-26 — **Projects, first version.** The hub is the database in the
  connection string: it holds the users (global) and the `projects` list.
  Each project's content is its own database on the same cluster: the first
  in the hub's own (so an install from before projects keeps its data
  where it is), the rest in `<hub>-<slug>`. The admin's project is a cookie
  the middleware turns into `x-darmio-project`; an agent sends the header
  itself; none means the first project, which is also what the public site
  shows until projects get domains. An install with no projects listed
  works as before, and only one with several reads the request, so
  single-project sites keep their static pages. Implements 2026-10-24's
  "separate databases"; a project's own connection string comes later.

- 2026-10-26 — **Two repos: the core and installs on top.** `darmio` is the
  core (private until the pre-release, then public). A maker's site is an
  install: a copy that tracks `darmio` as its upstream and pulls updates.
  Alex's is `alexbeltechi/beltechi` (beltechi.com, y3k.club). Core features
  are built here, never in an install, so updates flow one way. An install
  keeps its brands, site-specific code and its own docs; its content lives
  in its database and its keys in its deployment's environment. Why: one
  core everyone shares, and Alex takes updates the way every maker will.

- 2026-10-24 — **Every outside service is a connector.** Each job that
  depends on a service (newsletter list, sending, media storage, cross-
  posting, analytics, and in time the database and hosting) sits behind one
  interface, and the install ships one connector for it, set up and working
  (Kit for the list, Vercel Blob for media, MongoDB and Vercel for the
  rest). Settings shows each one as "set up for X", with how to change it by
  hand and a written recipe an agent can follow to swap it on the maker's
  own copy. More connectors come with updates, like Claude's connectors.
  Refines the MongoDB line below rather than overriding it: the install
  still ships one database, not two side by side; what changes is that the
  database, like every other service, must be swappable by an agent from
  the recipe, so no code outside its interface may depend on it. Why: makers
  who download it shouldn't be locked to Alex's choices (Kit, Vercel,
  MongoDB), and an agent can only swap what has a clean seam.
- 2026-10-24 — Projects are **separate databases**, not a project id on
  documents. The data keeps the single-install shape, so any project can be
  lifted to its own deployment by pointing a fresh install at its database.
  Why: scoping is one lookup to get right, and portability is free.
- 2026-10-24 — MongoDB is the only content store; no git or file backend
  (file storage was removed 2026-10). Install is a Vercel Deploy button
  (Atlas and Blob from the marketplace) and a first-run setup screen. Why:
  live editing, media and several brands need a database; a second backend
  is a second way.
- 2026-10-24 — Media storage sits behind one interface. Vercel Blob is the
  shipped implementation; S3-compatible (Cloudflare R2) is added when a
  brand's volume needs it. Blob's free allowance is per Vercel account, not
  per store, so separate stores don't multiply it.
- 2026-10-24 — **Parabola is a package** in this repo's npm workspace,
  published to npm by version. Other projects install it and pin a version,
  never copy the folder, and nothing checks for a newer version at run time.
  It may become its own repo once it has its own contributors; the
  workspace makes that a history filter, not a rewrite. Why: Alex changes
  Parabola and the CMS in one PR today.
- 2026-10-24 — The middleware says who is calling: `x-cms-actor` and, for a
  signed-in person, `x-cms-user-id`. Routes that need the person (account)
  read the header, never the session.

- 2026-10-20 — Posts are edited at `/admin/posts/<slug>`, beside
  `/admin/pages/<slug>`. The old `/admin/content/...` level dated from when
  it held two content types; there's one now, so posts and pages sit side
  by side. No redirects from the old URLs: they were never public.
- 2026-10-10 — One paved way per job, listed in `docs/conventions.md` and
  enforced by lint where it can be. A second way is debt: it's listed there
  and in one exceptions block in `eslint.config.mjs`, and that list only
  shrinks. `npm run verify` must pass before a commit.
- 2026-10-10 — Comments say why, not what; no history in comments.
- 2026-10-10 — Posts and pages are one `Entry` type; `collection` says which.
- 2026-10-10 — No carousel gallery layout. It was offered to agents but never
  built; stored ones show in the default layout.
- 2026-10-08 — Media items get two separate word fields. `keywords` come
  from `/curate` (via `selection.json`, sent by `/post`), are never typed by
  hand, and show in the media panel as attributed ("from /curate, <date>")
  and deletable. `tags` are Alex's own, added by hand in the admin media tab.
  The two never mix, so either can be cleared without losing the other.
  Search matches both. Keywords go on new uploads only; existing items
  aren't backfilled.
- 2026-10-08 — Images are made once, at upload: AVIF at 640, 1280 and 1920px
  wide plus the image itself at up to 2560px on its long edge (never
  enlarged), and one 1280px JPEG (PNG when transparent) for browsers without
  AVIF. Pages serve them as a `<picture>` srcset; Vercel's image service isn't
  used for them (its free tier caps transformations, and cold ones are slow).
  Originals aren't kept in Blob; they stay on Alex's disk. AVIF quality is a
  setting (default 70): going down later works from the stored copy, going up
  needs the originals. Uploads made before this keep their old files until
  they're uploaded again.
- 2026-10-04 — Minimal dependencies (no zod); third-party only when really
  needed, like the rich text editor.
- 2026-10-04 — The page editor reuses the post editor's components rather than
  sharing one editor; drift is accepted.

## Workflow

- 2026-10-20 — Each folder `/post` works on keeps an activity log,
  `_activity.md` beside the originals: one terse line per action on its
  pictures in the CMS (create, update, publish, replace, delete), and under
  it only the frames that changed (`+` added, `-` removed, `~` replaced),
  each with file, media id, fingerprint and sha, written for an agent to
  read quickly. Refining a post (swap, add, drop images) logs into the same
  file. It travels with the folder,
  so a copy on another drive carries its history, and `/post` reads it
  before uploading and asks before posting the same frames twice. No
  matching of a folder's images against the whole library: Alex chose the
  local record over a shared fingerprint matcher. Refines 2026-10-08 (live
  check, never stored state): the log is a history, not the truth, and
  `status.ts` checks each post it names against the CMS, which wins when
  they disagree. Every image also gets a title (its file name, slugified),
  alt text and 10 to 25 keywords for search; quality over token cost.
- 2026-10-20 — Every image `/post` uploads is findable by search. Its
  `tags` are Alex's words (places, people, project, camera) that `/post`
  proposes from what he said and he confirms; they go on the post and on
  every image. Its `keywords` say what's in the picture, written by the
  agent that looked at it (`/curate` in `selection.json`, else `/post`),
  shown with who wrote them and clearable. Overrides 2026-10-08 on two
  points: keywords can come from `/post` too, and tags can be set by an
  agent once Alex confirms them. Why: searching the library for a place or
  a subject should find every frame, not only the ones tagged by hand.
- 2026-10-19 — Media goes with a post only when asked, and only after a
  list. Deleting a post offers a checkbox (ticked) for the media only it
  uses; ticked, a second step lists every item before anything is deleted.
  Media other posts or pages use is never offered, just named as kept. The
  API does the same: a dry run lists it, and the delete only removes ids the
  caller confirmed. `/post` asks the same way, after deleting a post and
  after a re-push drops frames. Deleting ticked blocks and gallery images
  from the editor's ⋮ menu works the same, offering only media no other
  post, page or block uses. Why: Alex goes back and forth on an archive
  and wants no stale media, but nothing should vanish unseen.
- 2026-10-08 — The CMS skill that turns a folder into a post is `/post`
  (was `/upload`). It works on any folder but is built for a `/curate`
  selection: the curator's order, title, description and captions become the
  post, so the best route is `/curate` first, then `/post`.

- 2026-10-08 — Archive vs CMS is a **live check, run on request**, never
  stored state. Nothing in a local folder says "published": Alex can delete
  from the CMS at any time, and a mark on disk would go stale. The check
  works from any folder (not only ones the CMS came from), writes nothing,
  and when it finds nothing new, nothing changes. Images are matched by what
  they look like, not by file bytes or paths, so the match survives
  re-exports, renames and the CMS re-compressing its own copies. A post's
  source folder, where known, is only a hint.
- 2026-10-08 — Keep Blob storage light enough to stay on the free tier. Upload
  sizes and compression may go up or down later, so re-processing what's
  already up must be a re-runnable script, not a one-off.
- 2026-10-08 — Curation skills never delete anything, unless the user asks
  for a specific deletion. No culling skill for now.
- 2026-10-08 — techistack lives in its own repo (`~/Documents/Code/techistack`)
  and is linked into `~/.claude/skills/`; the CMS only uses it. Alex's own
  lessons stay local and git-ignored there, never published.

- 2026-10-07 — The agent works only when Alex starts a session or a bounded
  scheduled run. No open-ended loops. When work is ready for review, it stops
  and notifies Alex; he checks in whenever he has time.
- 2026-10-07 — Alex approves merges to `main`. The agent asks for a review
  when direction matters, like a design engineer asking their stakeholder.
- 2026-10-07 — Budget: well under €1000 a month; ideally a few hundred.
  Prefer improving the manual process over running more agents.
