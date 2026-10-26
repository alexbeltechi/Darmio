import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { publishEntry } from "@/lib/db/entries";
import { siteOrigin, syndicateEntry } from "@/lib/integrations/syndicate";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";

// POST /api/admin/publish - { slugs: string[], collection?: "posts" | "pages" }.
// Publish each post (or page): its
// changes go live, or the draft does. Then refresh the site and cross-post
// anything toggled on that hasn't gone out yet. One post failing (say, a draft
// with no category) doesn't stop the rest.
export async function POST(request: NextRequest) {
  let slugs: unknown;
  let collection: unknown = "posts";
  try {
    ({ slugs, collection = "posts" } = await request.json());
  } catch {
    // Handled below.
  }
  if (!Array.isArray(slugs) || slugs.length === 0 || !slugs.every((s) => typeof s === "string")) {
    return NextResponse.json({ error: "slugs must be a non-empty list" }, { status: 400 });
  }
  if (collection !== "posts" && collection !== "pages") {
    return NextResponse.json({ error: "collection must be posts or pages" }, { status: 400 });
  }

  const published: { slug: string; previousSlug: string; title: string }[] = [];
  const failed: { slug: string; error: string }[] = [];

  for (const slug of slugs as string[]) {
    const result = await publishEntry(collection, slug);
    if (result.entry) {
      published.push({ slug: result.entry.slug, previousSlug: slug, title: String(result.entry.data.title || "Untitled") });
    } else {
      failed.push({ slug, error: result.error || "Couldn't publish" });
    }
  }

  if (published.length > 0) revalidatePath("/", "layout");

  const actor = getActor(request);
  for (const { slug, previousSlug, title } of published) {
    await logActivity({ actor, action: `${collection === "pages" ? "page" : "post"}.publish`, target: slug, label: title, detail: slug !== previousSlug ? `was ${previousSlug}` : undefined });
  }

  // Pages aren't cross-posted.
  if (collection === "pages") return NextResponse.json({ published, failed, crossposted: [] });

  // Cross-posting never undoes a publish; its failures come back as notes.
  const origin = siteOrigin(request.url);
  const crossposted: string[] = [];
  for (const { slug } of published) {
    try {
      const { results } = await syndicateEntry(slug, origin);
      if (Object.values(results).some((r) => r?.status === "posted")) crossposted.push(slug);
    } catch (error) {
      console.error(`Cross-posting ${slug} failed:`, error);
    }
  }

  return NextResponse.json({ published, failed, crossposted });
}
