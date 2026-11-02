#!/usr/bin/env node
/**
 * Cross-platform test runner:
 * - Recursively finds all *.test.ts under src/ (no shell globstar required)
 * - Invokes tsx's CLI with the found files
 * - Optional: set NODE_BIN to run via a specific Node binary (e.g. Node 20)
 *
 * No external dependencies.
 */
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

function findTests(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findTests(full, acc);
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

function main() {
  const root = process.cwd();
  const srcDir = path.join(root, "src");
  if (!fs.existsSync(srcDir)) {
    console.error("No src/ directory found");
    process.exit(1);
  }
  const tests = findTests(srcDir);
  if (tests.length === 0) {
    console.error("No *.test.ts files found under src/");
    process.exit(1);
  }

  const nodeBin = process.env.NODE_BIN && process.env.NODE_BIN.trim();
  if (nodeBin) {
    const cli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
    const args = [cli, "--test", ...tests];
    const child = spawn(nodeBin, args, { stdio: "inherit" });
    child.on("exit", (code, signal) => {
      if (signal) process.kill(process.pid, signal);
      else process.exit(code ?? 1);
    });
    return;
  }

  const tsxBin = process.platform === "win32" ? "node_modules/.bin/tsx.cmd" : "node_modules/.bin/tsx";
  const child = spawn(path.join(root, tsxBin), ["--test", ...tests], { stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
}

main();

