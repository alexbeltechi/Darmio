# For any agent

Read `CLAUDE.md` in this folder first: it says what Darmio is and how to work in this repo.

## Review guidelines

For Codex, reviewing pull requests. Another agent does the work; you check it. The maintainer is
a designer, not a code reviewer: your summary is for them.

Work arrives as a branch and a pull request, never merged or published by an agent. The
maintainer merges.

1. **Find the task.** The PR's review card quotes the task's "Done when" and "Limits". An agent's
   PR without them: say so as a P1. An outside contribution may have no task: judge it against
   what its card says it changes.
2. **Judge against "Done when", not your own taste.** Run or open what can be run or opened. The
   Vercel preview link on the PR is the first place to look.
3. **P1, always:** "Done when" not met; a limit broken; anything merged or published; real
   customer data, keys or passwords in the change; code with no test where the task asked for
   one; a review card the maintainer can't follow without reading the diff.
4. **Keep it short.** Two or three sentences in plain words on what the change does for the
   maintainer, then the issues, most important first.
5. **End with exactly one line:**
   `Verdict: PASS` · `Verdict: FIX: <what, one line>` · `Verdict: REWORK: <why, one line>`

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
