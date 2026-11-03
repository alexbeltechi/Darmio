#!/usr/bin/env node
/**
 * Bundles Parabola's command (packages/parabola/cli) into bin/parabola.mjs,
 * the file the package's `bin` points at. The package ships TypeScript
 * source, so the command needs this one built file to run under plain Node.
 * Run by `npm pack` (the package's prepack) and by the CLI's test; the
 * output is not committed.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = join(fileURLToPath(import.meta.url), "../../packages/parabola");

export async function buildParabolaCli(outfile = join(root, "bin/parabola.mjs")) {
  await build({
    entryPoints: [join(root, "cli/main.ts")],
    outfile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    banner: { js: "#!/usr/bin/env node" },
  });
  return outfile;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`built ${await buildParabolaCli()}`);
}
