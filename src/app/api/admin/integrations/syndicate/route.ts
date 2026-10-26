import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { siteOrigin, syndicateEntry } from "@/lib/integrations/syndicate";

// POST /api/admin/integrations/syndicate - { slug }. Cross-post a published post
// to the platforms toggled on for it that it hasn't gone to yet. The editor
// calls this after a publish; a failure here never unpublishes the post.
export async function POST(request: NextRequest) {
  let slug: unknown;
  try {
    ({ slug } = await request.json());
  } catch {
    // Handled below.
  }
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }

  try {
    const { entry, results, error } = await syndicateEntry(slug, siteOrigin(request.url));
    if (!entry) return NextResponse.json({ error }, { status: 400 });

    // The source line may have just been filled in.
    if (Object.keys(results).length > 0) {
      revalidatePath(`/post/${entry.slug}`, "page");
    }
    return NextResponse.json({ data: entry, results, error });
  } catch (error) {
    console.error("Cross-posting failed:", error);
    return NextResponse.json({ error: "Cross-posting failed" }, { status: 500 });
  }
}
