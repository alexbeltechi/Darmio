"use client";

import { dsToast } from "@beltechi/parabola";

/** Where a project opens: its posts. */
export const PROJECT_START = "/admin/posts";

/** Make another project the admin's current one (remembered in this browser). */
async function selectProject(slug: string): Promise<boolean> {
  const res = await fetch("/api/admin/projects/current", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) dsToast.error("Couldn't switch project");
  return res.ok;
}

/**
 * Open a project at `path` (its posts, or its settings). Another project than
 * the current one loads the admin afresh: everything on screen belonged to
 * the old one.
 */
export async function openProject(slug: string, current: string | null, path = PROJECT_START) {
  if (slug !== current && !(await selectProject(slug))) return;
  window.location.assign(path);
}
