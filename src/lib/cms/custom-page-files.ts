import { promises as fs } from "node:fs";
import path from "node:path";
import { listAllEntries } from "@/lib/db/entries";
import { getSiteSettings, updateSiteSettings } from "@/lib/db/settings";
import { customPageOf } from "./custom-pages";

/**
 * A custom page's code goes when its post does. A custom page is a file in
 * the site's `src/extensions/post-pages/` and a line in
 * `src/extensions/post-pages.ts`; deleting the last post that names it
 * removes both, so no dead code is left behind for someone to find later.
 *
 * Where the site runs from its own folder (a computer, how makers and agents
 * work on it) the files are removed on the spot and show up as a change to
 * commit. A deployed site can't change its own code: there the key is noted
 * in the settings (`customPagesToRemove`), and the next time the site runs
 * from its folder against that database the code is removed then.
 */

const REGISTRY = path.join("src", "extensions", "post-pages.ts");
const PAGES_DIR = path.join("src", "extensions", "post-pages");

/** The registry's text without this key's line. Comments (the example) are left alone. */
export function withoutPageLine(source: string, key: string): string {
  const line = new RegExp(`^[ \\t]*["']${key}["'][ \\t]*:[ \\t]*\\(\\)[ \\t]*=>[ \\t]*import\\([^)]*\\),?[ \\t]*\\r?\\n`, "m");
  return source.replace(line, "");
}

/** Removes the page's line and its file (or folder). False where the code can't be written (a deployed site). */
async function removeCode(key: string, root = process.cwd()): Promise<boolean> {
  try {
    const registry = path.join(root, REGISTRY);
    const source = await fs.readFile(registry, "utf8");
    const next = withoutPageLine(source, key);
    // The line goes first, so nothing imports a file that's gone.
    if (next !== source) await fs.writeFile(registry, next);
    for (const name of [`${key}.tsx`, `${key}.ts`, key]) {
      await fs.rm(path.join(root, PAGES_DIR, name), { recursive: true, force: true });
    }
    return true;
  } catch {
    return false;
  }
}

/** Whether any post or page still names this custom page. */
async function stillUsed(key: string): Promise<boolean> {
  return (await listAllEntries()).some((entry) => customPageOf(entry.data)?.key === key || customPageOf(entry.pendingData ?? undefined)?.key === key);
}

/**
 * After a post is deleted: its custom page's code goes too, unless another
 * post uses the same page. Returns the key when the code is gone or noted
 * for removal.
 */
export async function removeCustomPageOf(data: Record<string, unknown> | undefined): Promise<string | null> {
  const key = customPageOf(data)?.key;
  if (!key || (await stillUsed(key))) return null;
  if (!(await removeCode(key))) {
    const { customPagesToRemove } = await getSiteSettings();
    await updateSiteSettings({ customPagesToRemove: [...customPagesToRemove, key] });
  }
  return key;
}

/**
 * Removes the code noted for removal by a deployed site, where the code can
 * be written. A key a post names again in the meantime is kept. Quiet when
 * there's nothing to do.
 */
export async function removeNotedCustomPages(): Promise<void> {
  const { customPagesToRemove } = await getSiteSettings();
  if (customPagesToRemove.length === 0) return;
  const left: string[] = [];
  for (const key of customPagesToRemove) {
    if (await stillUsed(key)) continue;
    if (!(await removeCode(key))) left.push(key);
  }
  if (left.length !== customPagesToRemove.length) await updateSiteSettings({ customPagesToRemove: left });
}
