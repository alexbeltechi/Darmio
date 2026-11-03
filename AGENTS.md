# For any agent

Read `CLAUDE.md` in this folder first: it says what Darmio is and how to work in this repo.

## Review guidelines

For Codex, reviewing pull requests. Claude does the work in Alex's shifts; you check it. Alex is
a designer, not a code reviewer: your summary is for him.

Darmio is in the **live** zone (released 2026-11-25, free under MIT): branch and PR only, never
merged or published by an agent. Alex merges.

1. **Find the task.** The PR's review card quotes the task's "Done when" and "Limits" (the task
   file lives in Alex's private brain repo). Missing: say so as a P1.
2. **Judge against "Done when", not your own taste.** Run or open what can be run or opened. The
   Vercel preview link on the PR is the first place to look.
3. **P1, always:** "Done when" not met; a limit broken; anything merged or published; real
   customer data, keys or passwords in the change; code with no test where the task asked for
   one; a review card Alex can't follow without reading the diff.
4. **Keep it short.** Two or three sentences in plain words on what the change does for Alex, then
   the issues, most important first.
5. **End with exactly one line:**
   `Verdict: PASS` · `Verdict: FIX: <what, one line>` · `Verdict: REWORK: <why, one line>`
