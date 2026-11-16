/**
 * Leak check: this repo is public and the same for every maker, so nothing
 * personal or secret belongs in it. Fails on a name, a private link or path,
 * a citation of notes that aren't in the repo, or anything shaped like a key.
 * Run with `npm run check:leaks`; exits 1 on any hit.
 *
 * Allowed: the copyright line in LICENSE, the repo's own GitHub address, the
 * `@beltechi/parabola` package name, the owner's name and contact email in
 * the legal pages (TRADEMARK.md, CONTRIBUTING.md, and the email in the
 * README's licence note), and Y3K inside Ilo's example site
 * (`seed/`, `public/parabola/preview/`), which is her story. Only the core
 * is checked: an install (a maker's own copy, renamed in package.json) holds
 * their own name and notes, and passes.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ALLOWED = [
  /Copyright \(c\) \d{4} Alex Beltechi/,
  /github\.com\/alexbeltechi\/(darmio|techistack|parabola)(\.git)?/g,
  /alexbeltechi\/(darmio|parabola)\b/g,
  /@beltechi\/parabola/g,
];

/** The owner and contact the legal pages must name, allowed only in those files. */
const LEGAL_OWNER: { files: RegExp; text: RegExp }[] = [
  { files: /^(TRADEMARK|CONTRIBUTING)\.md$/, text: /Andrei Alexandru Beltechi|alexbeltechi@gmail\.com/g },
  { files: /^README\.md$/, text: /alexbeltechi@gmail\.com/g },
];

const CHECKS: { name: string; pattern: RegExp; except?: RegExp }[] = [
  { name: "a person's name", pattern: /\bAlex\b/ },
  { name: "a private brand", pattern: /beltechi/i },
  { name: "Y3K outside Ilo's site", pattern: /\by3k\b/i, except: /^(seed\/|public\/parabola\/preview\/)/ },
  { name: "an old name", pattern: /dharmify/i },
  { name: "a path on someone's computer", pattern: /\/Users\/[A-Za-z]/ },
  { name: "a citation of notes not in this repo", pattern: /decisions?,? ?20\d\d-\d\d-\d\d|\bBEL-\d+\b/ },
  { name: "a database password", pattern: /mongodb(\+srv)?:\/\/[^\s:@/]+:[^\s@<]+@/ },
  { name: "a key or token", pattern: /vercel_blob_rw_\w{10}|sk-ant-\w{10}|ghp_\w{20}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY/ },
];

if (JSON.parse(readFileSync("package.json", "utf8")).name !== "darmio") {
  console.log("Leak check: skipped, this is an install, not the core");
  process.exit(0);
}

const SKIP = /(^|\/)package-lock\.json$|\.(jpe?g|png|gif|webp|avif|mp4|mov|woff2?|ico|pdf)$/i;

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter((file) => file && !SKIP.test(file) && file !== "scripts/check-leaks.ts");

const hits: string[] = [];
for (const file of files) {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  text.split("\n").forEach((line, i) => {
    const allowed = [...ALLOWED, ...LEGAL_OWNER.filter((legal) => legal.files.test(file)).map((legal) => legal.text)];
    const cleaned = allowed.reduce((rest, pattern) => rest.replace(pattern, ""), line);
    for (const check of CHECKS) {
      if (check.except?.test(file)) continue;
      if (check.pattern.test(cleaned)) hits.push(`${file}:${i + 1}: ${check.name}`);
    }
  });
}

if (hits.length) {
  console.error(`Leak check: ${hits.length} found\n${hits.join("\n")}`);
  process.exit(1);
}
console.log(`Leak check: ${files.length} files, nothing personal or secret`);
