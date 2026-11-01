# Contributing to Darmio

Thanks for wanting to help. Darmio is built by one maintainer with agents, so
small, clear changes are easiest to take.

## Before you start

- For anything bigger than a small fix, open an issue first and say what you
  want to change and why. A short chat saves a rejected pull request.
- Only what every maker would want goes in this repo. Nothing about one
  person's site: no names, copy, categories or keys in code.
- Read `docs/conventions.md`: the one way to do each common job. Use it
  rather than adding a second way.
- For UI, read `packages/parabola/README.md`. Build from Parabola components
  and tokens: no raw colour classes, no hex values.

## Making a change

1. Fork the repo and make a branch.
2. Make the change. Keep it small and about one thing.
3. Run `npm run verify` and make it pass. It runs typecheck, lint with no
   warnings, the Parabola token check, the leak check and a production
   build. If a lint rule complains, the message usually names the existing
   way to do that thing. Don't silence the rule.
4. Open a pull request that says what changed and why.

## Contributor agreement

> **Draft: needs a lawyer's read before release.** Written in plain words by
> a non-lawyer. The final wording, and how you sign it (a bot on your first
> pull request, most likely), is still to be set.

The aim: Darmio stays free and open source, and the maintainer can still
change course (move the project, update the licence for new versions, or run
a hosted version) without chasing every contributor for permission.

By opening a pull request, you agree that:

1. **It's yours to give.** You wrote the contribution, or you have the right
   to submit it. It isn't copied from somewhere that forbids it, and your
   employer (if it has a claim on your work) is fine with it.
2. **You grant a licence.** You give the project's maintainer a perpetual,
   worldwide, royalty-free, non-exclusive licence to use, copy, change,
   distribute and sublicense your contribution, under any licence the
   maintainer chooses, including the MIT licence this project uses now.
3. **You keep your copyright.** You can use your own contribution anywhere
   else.
4. **No promise of use.** The maintainer may reject, change or remove your
   contribution.
5. **No warranty.** You provide it as is, and you don't owe support.
6. **The name stays.** Contributing doesn't give you any rights to the
   "Darmio" name or logo (see `TRADEMARK.md`).

If any of this doesn't work for you, don't open a pull request. Open an issue
instead.

Questions about the agreement: `[CONTACT EMAIL]`.
