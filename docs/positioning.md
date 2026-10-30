---
reviewed: 2026-10-29
owner: Alex
---

# Positioning and market fit

Who Darmio is for, the job it does, how a launch moves, the phases, the
competition and the prices we're testing. `vision.md` says what Darmio is
and why; this file says who it sells to and how it wins. Where the two
disagree, this one leads (Alex, 2026-10-29). Drafted with Alex as a Claude
Doc, [Darmio — Positioning & Market Fit](https://claude.ai/artifact/Xv4QBU4bcRy63WgsKGUaUh),
on 2026-10-29; this file is now the one to keep current.

## Positioning

**Turn your practice into a business people take seriously. Built with AI,
always yours.**

- **For:** makers, solo founders and creators launching or relaunching a
  practice. First customers: coaches, instructors, creators. Photographers,
  designers and artists are creators too.
- **Not for:** SMBs or larger businesses.
- **Job:** launch the person and their offer first. Scaling (subscribers,
  outreach, campaigns, paid ads) comes later.
- **Category:** a taste harness. Open source, AI-first, with a UI to fall
  back on.

## Problem

1. Getting taken seriously online is hard: AI output is recognised as
   AI-made, in wording and in design.
2. Original content without an AI-amplified workflow is technically hard.
3. A refined personal brand needs taste and budget. Agencies are out of
   reach, and there is no middle ground.
4. A working setup takes 5–6 subscriptions (Kit and others), each holding
   part of the business.

## Why now, why Alex

- Models can now run a brand's workflows, but without rules they regress to
  the mean.
- Creator services (Kit, Beehiiv) expose MCPs and agent workflows, so one
  owned hub can drive them.
- Alex: 25 years across branding, graphic, advertising, digital and product
  design; product designer and design engineer building agentic tools; has
  been a struggling creator himself.

## Product principles

1. **Rules, not automated taste.** Rules create the conditions for taste to
   emerge instead of regressing to the mean. They are retuned as models
   improve, including which model handles which output.
2. **Start from craft.** Every template and theme passes a craft bar; users
   customise from higher ground.
3. **Own everything.** Content, brand system, interview answers and client
   list live in files the user owns. The web version keeps a local copy:
   download any time, pause and return, or graduate to your own team.
4. **AI-first, UI as fallback.** Agents do the work; the UI shows what is
   happening and works without spending tokens.
5. **Services plug in and out.** Kit, Stripe and others connect; the source
   of truth stays in Darmio. Ownership covers only what Darmio stores, so
   subscribers and clients are synced in.
6. **Market fit is a feature.** Agents spend more effort only after a launch
   passes its current gate.

## Launch flow

Every launch moves through five gated stages. Agents read the signals and
write a weekly fit summary: what works, what to change, whether to advance.

| Stage | What happens | Gate to next stage | Stored in |
| --- | --- | --- | --- |
| 1. Clarity | Onboarding interview (Dharma method): who you serve, the offer, the price, the proof you have. Answered manually or with AI ([BEL-116](https://linear.app/beltechi/issue/BEL-116/onboarding-interview-settle-who-offer-and-price-dharma-method)) | Who, offer and price filled in | Brain MD files in the library |
| 2. Interest | One offer page with one call to action; social posts and emails generated from the same answers | First sign-ups or booking clicks | Page analytics |
| 3. Conversations | Agent drafts personal messages to 20 people you know; you send them | Calls booked | `clients.csv` |
| 4. First paid client | One real payment, at any price | Payment received | `clients.csv`, Stripe |
| 5. Repeat | Second and third client on the same offer; scaling features switch on | None | `clients.csv` |

**Client tracking:** `clients.csv` in the library, one row per person,
edited by hand or by AI. Columns: name, email, source, stage (lead, call,
paid, repeat), offer, price, date, notes. Stripe is the record of payments;
Kit sync is optional. It holds personal data, so the web version needs GDPR
export and deletion.

## Phases

The local, technical version ships first; the web version is built on it.

| Phase | Version | Who | What it does | Leaves behind |
| --- | --- | --- | --- | --- |
| 1. Agency wedge (now) | Local, self-hosted, run by your own Claude Code | You, makers, solo founders, small studios | Launches sites and offers for clients and your own micro-brands | Themes, taste profiles, case studies |
| 2. Hosted platform (later) | Web, no setup, keeps a local copy | Coaches, instructors, creators | Site, content and community in one, run by agents | Launches with Phase 1's theme library |

Phase 1 users are technical, or non-technical and willing to set up with
their own AI reading the docs. Phase 2 opens at 5 live sites, themes selling
unprompted, and 3 creators asking for a hosted version.

## Competitors

Polsia and Ghost are the main competitors. Darmio is agent-run like Polsia,
owned like Ghost, accessible-first unlike Ghost, with a craft bar neither
has.

| Player | What it is | Where Darmio wins | Where Darmio loses |
| --- | --- | --- | --- |
| [Polsia](https://noqta.tn/en/news/polsia-ai-autonomous-company-30m-funding-2026) | Agents run whole companies; raised $30M at a $250M valuation (May 2026) | Taste, creator focus, no lock-in; critics report about 8,500 active of 120,000 projects ([36Kr](https://www.36kr.com/p/3825813697565316)) | Capital, distribution, brand awareness |
| [Ghost](https://pricingsaas.com/companies/ghost) | Open-source, nonprofit publishing platform; free to self-host, Ghost(Pro) Publisher about $29/month, 0% of creator earnings | Agents build and run the brand, not just publish; taste engine; community and brand assets in one | Mature newsletter and membership tooling, a trusted brand, the same ownership story |
| [Skool](https://cartmango.com/skool-pricing/) | Community plus courses; $9 Hobby or $99 Pro per community | Your own site and design; you can't connect your own Stripe on Skool | Gamification, discovery, dead-simple setup |
| [Circle](https://sacra.com/research/circle-at-68m-arr/) | Community platform; Sacra estimates $68M ARR (May 2026), now with email, AI agents and a website builder | Open source, craft, price | Breadth, B2B, team and funding |
| [Kajabi](https://dupple.com/blog/online-course-platforms-comparison) | Courses and coaching; Basic rose to $179/month in January 2026 | Price, lighter weight | Course depth, payouts track record |
| [Beehiiv](https://www.axios.com/2026/03/24/beehiiv-creator-ai-chatbot-mcp) | Newsletter expanding into sites, podcasts and products; lets creators manage accounts through AI platforms | Design quality, ownership | Newsletter growth and ad network |
| Agent-native CMSs (Cosmic, Drupal) | Content infrastructure for dev and marketing teams | Creator focus, simplicity | Enterprise governance |

- **Polsia evidence:** by its founder's own count (May 2026), about 10% of
  companies had made at least 1 USD, the best roughly 3,000–4,000 USD, and
  about half of customers left in month one. Main gap: nothing checks demand
  before agents build.
- **Ghost** is the sharpest price comparison: same ownership story,
  Publisher plan at $29.

## Proof we're aiming for

Darmio works if launched people make money and keep going. Targets are first
guesses.

| Measure | Target | Why it matters |
| --- | --- | --- |
| First paid client within 60 days | 30% or more of launched customers | Polsia's bar is about 10% ever making a dollar |
| Still publishing or editing in week 6 | 60% or more | About half of Polsia customers leave in month one |
| Blind test: "does this look AI-made?" | Most viewers say no | Direct test of the taken-seriously claim |
| Days from signup to live offer page | 7 or fewer | Speed is what Polsia users praise |
| Customers who export, then come back | Tracked, any number | Proves the no-lock-in bet |
| Named before-and-after case studies | 5 | What sells to the next customer |

## Pricing hypotheses

Bootstrapped: Phase 1 services and themes fund the build. All figures are
hypotheses.

| Phase | Offer | Price hypothesis | Why this price |
| --- | --- | --- | --- |
| 1 | Darmio core, self-hosted | Free, MIT | Distribution and trust |
| 1 | Themes and taste profiles | €49–149 one-off | Impulse buy for people who already self-host |
| 1 | Done-for-you site setup | €1,500–4,000 per site | Alex's design skills are the product at this stage |
| 2 | Hosted Creator plan | about €29/month | Same as Ghost Publisher at $29, so taste and agents must justify it |
| 2 | Hosted Pro plan with community | about €79/month, no platform fee | Undercuts Skool Pro at $99 per community and includes the site |
| 2 | Agent usage | Metered, or bring your own key | Keeps inference cost off our margin |

## Risks

- **Scope.** Circle, Beehiiv and Ghost already bundle most features. Phase 1
  ships one flow well: interview, offer page, first client.
- **Two products.** One codebase and one theme format for local and web.
- **Inference margin.** Hosted agents cost money: meter usage or bring your
  own key.
- **Free exits.** The web version must stay worth paying for, not hard to
  leave.
- **Accessibility promise.** Don't market "accessible" until the web version
  exists.
- **Payments and tax.** Hosting creator payments from a Romanian PFA raises
  EU VAT and merchant-of-record questions.

## Decisions

Also in `decisions.md` (2026-10-29).

- **Name:** Darmio. Domain owned: darmio.io.
- **Funding:** bootstrapped, no investors.
- **Audience:** makers, solo founders, creators; not SMBs.
- **Headline:** Turn your practice into a business people take seriously.
  Built with AI, always yours.
- **Release order:** local first, web later.
- **No lock-in:** the web version keeps a local copy of everything.
- **Main competitors:** Polsia and Ghost.
- **Client tracking:** `clients.csv` in the library.
- **Hosted Pro price hypothesis:** €79/month.
- **Phase 2 gate:** 5 live sites.

## Open questions

- Buy darmio.com (about $1,000) now, or before marketing Phase 2?
- Do the first 10 customers come from coaches, instructors or creators?
- Metered usage or bring-your-own-key for hosted agents?
- What stops Ghost from adding agents and taste rules?
- Does the brain kit share the interview's MD format?

## Next 90 days

From 2026-10-29. Tracked in Linear; the product items are in `roadmap.md`.

- Ship Alex's own site on Darmio as the showcase.
- Build the onboarding interview (BEL-116).
- Build the offer page template, with social and email from the same
  answers.
- Launch 3–5 people (clients or own micro-brands) through the five stages.
- Interview 10 coaches, instructors and creators about their stack, spend
  and frustrations.
- Run the blind "looks AI-made?" test on 3 Darmio sites.
- Sell the first theme or taste profile.

## Sources

- [Polsia: claims and critics (Gengrades)](https://gengrades.com/polsia)
- [Is Polsia legit? Founder's numbers (Crevio)](https://crevio.co/blog/is-polsia-legit)
- [Polsia review: demand and public feed figures (Preuve)](https://preuve.ai/blog/polsia-review)
- [Polsia controversy and project counts (36Kr)](https://www.36kr.com/p/3825813697565316)
- [Polsia raises $30M (Noqta)](https://noqta.tn/en/news/polsia-ai-autonomous-company-30m-funding-2026)
- [Ghost pricing 2026 (PricingSaaS)](https://pricingsaas.com/companies/ghost)
- [Skool pricing 2026 (Cartmango)](https://cartmango.com/skool-pricing/)
- [Circle at $68M ARR (Sacra)](https://sacra.com/research/circle-at-68m-arr/)
- [Kajabi 2026 price change (Dupple)](https://dupple.com/blog/online-course-platforms-comparison)
- [Beehiiv and AI platforms (Axios)](https://www.axios.com/2026/03/24/beehiiv-creator-ai-chatbot-mcp)
