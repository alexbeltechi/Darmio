import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { dsBrandKit, dsThemeCode, dsThemeCommands } from "../../packages/parabola/brand-kit";
import { listComponents, parseArgs, resolveComponent, run, themeFromText } from "../../packages/parabola/cli/core";
import { DS_DEFAULT_THEME } from "../../packages/parabola/theme";

const pkgRoot = join(process.cwd(), "packages/parabola");
const kit = dsBrandKit({ ...DS_DEFAULT_THEME, radius: 6 }, "Test theme");

function project() {
  const cwd = mkdtempSync(join(tmpdir(), "parabola-cli-"));
  mkdirSync(join(cwd, "src/app"), { recursive: true });
  writeFileSync(join(cwd, "src/app/globals.css"), '@import "tailwindcss";\n\nbody { margin: 0; }\n');
  writeFileSync(join(cwd, "package.json"), JSON.stringify({ dependencies: { react: "19.0.0" } }));
  const out: string[] = [];
  return { cwd, out, io: { log: (l: string) => out.push(l), error: (l: string) => out.push(`ERR ${l}`) } };
}

test("parseArgs reads values, inline values and switches", () => {
  const { positional, flags } = parseArgs(["add", "theme", "--from", "a.json", "--dir=x", "--overwrite"]);
  assert.deepEqual(positional, ["add", "theme"]);
  assert.deepEqual(flags, { from: "a.json", dir: "x", overwrite: true });
  assert.throws(() => parseArgs(["add", "--from"]));
});

test("the command's code reads back as the same theme", () => {
  const back = themeFromText(dsThemeCode(kit));
  assert.equal(back?.radius, 6);
  assert.equal(themeFromText(JSON.stringify(kit.theme))?.radius, 6);
  assert.equal(themeFromText("not a theme"), null);
  assert.match(dsThemeCommands(kit).theme, /^npx \S+ add theme --code [A-Za-z0-9+/=]+$/);
});

test("a component resolves to its files and packages, provider's theme types stubbed", () => {
  const found = resolveComponent(pkgRoot, "button");
  assert.deepEqual(found.files, ["primitives/button.tsx", "cn.ts", "provider.tsx"]);
  assert.ok(found.packages.includes("lucide-react"));
  assert.ok(listComponents(pkgRoot).includes("button"));
  assert.throws(() => resolveComponent(pkgRoot, "nope"), /No component/);
});

test("add theme writes the tokens and imports them once", () => {
  const { cwd, io } = project();
  assert.equal(run(["add", "theme", "--code", dsThemeCode(kit)], cwd, pkgRoot, io), 0);
  for (const f of ["tokens.css", "theme.css", "parabola-theme.json"]) assert.ok(existsSync(join(cwd, "src/parabola", f)), f);
  assert.match(readFileSync(join(cwd, "src/parabola/theme.css"), "utf8"), /--ds-button:/);
  const css = readFileSync(join(cwd, "src/app/globals.css"), "utf8");
  assert.match(css, /@import "tailwindcss";\n@import "\.\.\/parabola\/tokens\.css";\n@import "\.\.\/parabola\/theme\.css";/);
  run(["add", "theme", "--code", dsThemeCode(kit)], cwd, pkgRoot, io);
  assert.equal(readFileSync(join(cwd, "src/app/globals.css"), "utf8"), css);
});

test("add theme --from reads a parabola-theme.json", () => {
  const { cwd, io } = project();
  writeFileSync(join(cwd, "parabola-theme.json"), JSON.stringify(kit.theme));
  assert.equal(run(["add", "theme", "--from", "parabola-theme.json"], cwd, pkgRoot, io), 0);
  assert.equal(run(["add", "theme", "--from", "missing.json"], cwd, pkgRoot, io), 1);
});

test("add button copies it with its imports and keeps files that exist", () => {
  const { cwd, out, io } = project();
  assert.equal(run(["add", "button"], cwd, pkgRoot, io), 0);
  const button = readFileSync(join(cwd, "src/parabola/primitives/button.tsx"), "utf8");
  assert.match(button, /from "\.\.\/provider"/);
  const provider = readFileSync(join(cwd, "src/parabola/provider.tsx"), "utf8");
  assert.doesNotMatch(provider, /from "\.\/theme"/);
  assert.ok(out.some((l) => l.includes("npm install") && l.includes("lucide-react")));
  writeFileSync(join(cwd, "src/parabola/cn.ts"), "mine");
  run(["add", "button"], cwd, pkgRoot, io);
  assert.equal(readFileSync(join(cwd, "src/parabola/cn.ts"), "utf8"), "mine");
  assert.equal(run(["add", "nope"], cwd, pkgRoot, io), 1);
});
