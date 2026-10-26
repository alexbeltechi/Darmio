/**
 * Builds a self-contained HTML wireframe from a React file made of real
 * Parabola components. The page is rendered to static HTML and the styles it
 * uses are compiled by Tailwind from Parabola's own tokens, so the buttons,
 * pills and fields are the real ones and the file needs nothing else: it opens
 * anywhere. Light and dark follow the system setting. No JavaScript is shipped.
 *
 *   npx tsx scripts/wireframe-build.ts <page.tsx> [--title "Services"] > wireframe.html
 *
 * <page.tsx> default-exports a component (no hooks, no state) and imports from
 * "@beltechi/parabola"; plain Tailwind classes with Parabola tokens
 * (bg-ds-surface-subtle, text-ds-fg-muted, rounded-ds-lg, text-h2…) do layout.
 * See .claude/skills/landing-page.
 */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const root = join(__dirname, "..");
const tokensPath = join(root, "packages/parabola/tokens.css");

const args = process.argv.slice(2);
const titleAt = args.indexOf("--title");
const title = titleAt >= 0 ? args[titleAt + 1] : "Wireframe";
const input = args.find((a, i) => !a.startsWith("--") && (titleAt < 0 || i !== titleAt + 1));
if (!input) {
  console.error('Usage: npx tsx scripts/wireframe-build.ts <page.tsx> [--title "Services"] > wireframe.html');
  process.exit(1);
}

/** The `--ds-*` declarations of the top-level block opened by `selector {` in tokens.css. */
function declarations(selector: string): string {
  const css = readFileSync(tokensPath, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const start = css.search(new RegExp(`^${selector.replace(".", "\\.")}\\s*\\{`, "m"));
  if (start < 0) throw new Error(`No ${selector} block in tokens.css`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));
  return [...body.matchAll(/(--ds-[\w-]+)\s*:\s*([^;]+);/g)]
    .map(([, name, value]) => `    ${name}: ${value.trim()};`)
    .join("\n");
}

async function main() {
  // The project's tsconfig leaves JSX to Next, so the page expects React in scope.
  (globalThis as { React?: typeof React }).React = React;
  // The source is copied into the project (.next/, git-ignored) first, so its imports ("@/…",
  // packages) resolve wherever it was written.
  const cache = join(root, ".next/wireframe-src");
  mkdirSync(cache, { recursive: true });
  const copy = join(cache, `page-${Date.now()}${extname(input!) || ".tsx"}`);
  copyFileSync(resolve(input!), copy);
  let body: string;
  try {
    const mod = await import(pathToFileURL(copy).href);
    const Page = mod.default ?? mod.Page;
    if (typeof Page !== "function") throw new Error(`${input} must default-export a component`);
    body = renderToStaticMarkup(createElement(Page));
  } finally {
    rmSync(copy, { force: true });
  }

  // Tailwind reads the rendered markup for the classes to compile.
  const dir = mkdtempSync(join(tmpdir(), "wireframe-"));
  try {
    const markup = join(dir, "page.html");
    writeFileSync(markup, body);
    const source = `
      @import "tailwindcss" source(none);
      @import "${tokensPath}";
      @source "${markup}";
      @layer base {
        body { margin: 0; background: var(--ds-bg); color: var(--ds-fg); font-family: var(--ds-font); -webkit-font-smoothing: antialiased; }
      }`;
    const { css } = await postcss([tailwind()]).process(source, { from: join(root, "src/app/wireframe.css") });
    const dark = `@media (prefers-color-scheme: dark) {\n  :root {\n${declarations(".dark").replace(/^ {4}/gm, "    ")}\n  }\n}\n`;

    process.stdout.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/</g, "&lt;")}</title>
<style>
${css}
${dark}</style>
</head>
<body>
${body}
</body>
</html>
`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
