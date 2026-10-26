/**
 * Cross-posting a published post to X and LinkedIn. Server only.
 *
 * A post goes out as text: its first text block (the title when there's
 * none), cut to fit, then a link back to the post on the site. No images yet.
 * Each platform gets a post once; the result is kept on the post as
 * `data.syndication`, and the first one posted fills an empty source line.
 */

import { getEntry, updateEntry } from "@/lib/db/entries";
import { getAccessToken, markExpired } from "@/lib/db/integrations";
import { getSiteSettings } from "@/lib/db/settings";
import type { Block, Entry } from "@/lib/cms/types";
import { AuthError, providers } from "./providers";
import { PLATFORM_META, PLATFORMS, type Crosspost, type Platform, type Syndication, type SyndicationRecord } from "./types";

/** The site's public origin: SITE_URL, else the origin the request came in on. */
export function siteOrigin(requestUrl: string): string {
  return (process.env.SITE_URL || new URL(requestUrl).origin).replace(/\/$/, "");
}

/** Rich-text HTML to plain text, keeping paragraph and line breaks. */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h\d|li|blockquote)>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Cut at a word boundary to at most `max` characters, with an ellipsis. */
function truncate(text: string, max: number): string {
  const chars = [...text];
  if (chars.length <= max) return text;
  const cut = chars.slice(0, max - 1).join("");
  const atWord = cut.replace(/\s+\S*$/, "");
  return `${(atWord.length > max * 0.6 ? atWord : cut).trimEnd()}…`;
}

export function composePostText(entry: Entry, postUrl: string, platform: Platform): string {
  const blocks = (entry.data.content as Block[] | undefined) || [];
  const body =
    blocks.map((b) => (b.type === "text" ? htmlToText(b.html) : "")).find(Boolean) ||
    String(entry.data.title || "").trim();

  // X counts every link as 23 characters, however long it is.
  const linkCost = platform === "x" ? 23 : postUrl.length;
  const budget = PLATFORM_META[platform].maxLength - linkCost - 2;
  return body ? `${truncate(body, budget)}\n\n${postUrl}` : postUrl;
}

async function postTo(platform: Platform, entry: Entry, postUrl: string): Promise<SyndicationRecord> {
  const at = new Date().toISOString();
  const name = PLATFORM_META[platform].name;

  const token = await getAccessToken(platform);
  if (!token) return { status: "failed", error: `${name} isn't connected, or the connection expired`, at };

  try {
    const text = composePostText(entry, postUrl, platform);
    const post = await providers[platform].publish(token.accessToken, text, token.account);
    return { status: "posted", url: post.url, externalId: post.externalId, at };
  } catch (error) {
    if (error instanceof AuthError) await markExpired(platform, error.message);
    return { status: "failed", error: error instanceof Error ? error.message : `Posting to ${name} failed`, at };
  }
}

/**
 * Post a published entry to every platform toggled on for it that it hasn't
 * gone to yet. Returns the updated entry and this run's results.
 */
export async function syndicateEntry(
  slug: string,
  origin: string
): Promise<{ entry?: Entry; results: Syndication; error?: string }> {
  const entry = await getEntry("posts", slug);
  if (!entry) return { results: {}, error: "Post not found" };
  if (entry.status !== "published") return { results: {}, error: "Only published posts can be cross-posted" };

  const crosspost = (entry.data.crosspost as Crosspost | undefined) || {};
  const previous = (entry.data.syndication as Syndication | undefined) || {};
  const targets = PLATFORMS.filter((p) => crosspost[p] && previous[p]?.status !== "posted");
  if (targets.length === 0) return { entry, results: {} };

  const postUrl = `${origin}/post/${entry.slug}`;
  const results: Syndication = {};
  // One at a time, so a slow platform doesn't hold the other's result hostage
  // and the order the source line picks from is stable.
  for (const platform of targets) {
    results[platform] = await postTo(platform, entry, postUrl);
  }

  const data: Record<string, unknown> = { syndication: { ...previous, ...results } };

  // An empty source line takes the first platform posted to, named by its
  // preset in Settings when there is one.
  const firstPosted = targets.find((p) => results[p]?.status === "posted");
  if (firstPosted && !entry.data.sourceUrl) {
    const { sourceLabels } = await getSiteSettings();
    data.sourceLabel =
      sourceLabels.find((l) => l.platform === firstPosted)?.name || PLATFORM_META[firstPosted].name;
    data.sourceUrl = results[firstPosted]!.url;
  }

  // Into any unpublished edits too, so the next publish doesn't drop the results.
  const updated = await updateEntry("posts", slug, { data, pendingData: data });
  return { entry: updated.entry ?? entry, results, error: updated.error };
}
