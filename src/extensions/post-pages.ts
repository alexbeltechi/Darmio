/**
 * This site's custom pages for posts, by key. A post with
 * `customPage: { key }` is drawn by the page listed here under that key;
 * without one (or with it switched off) it gets the standard layout.
 *
 * This file and the folder beside it belong to the site, not to Darmio:
 * Darmio ships it empty and doesn't change it, so pulling Darmio's updates
 * never clashes with a site's own pages. Each page is loaded only when its
 * post is opened.
 *
 *   "a-foggy-morning": () => import("./post-pages/a-foggy-morning"),
 *
 * How to write one, and the rule it follows (all content stays in the post):
 * `src/lib/cms/custom-pages.ts`, and the agent guide's "Custom pages".
 */
import type { ComponentType } from "react";
import type { CustomPostPageProps } from "@/lib/cms/custom-pages";

export const POST_PAGES: Record<string, () => Promise<{ default: ComponentType<CustomPostPageProps> }>> = {};
