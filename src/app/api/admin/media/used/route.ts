import { NextResponse } from "next/server";
import { listEntries } from "@/lib/db/entries";
import { loadSchemas } from "@/lib/cms/schema";
import { getEntryMediaIds } from "@/lib/cms/entry-media";
import { splitByUse } from "@/lib/cms/entry-media-cascade";

// GET /api/admin/media/used - Get all media IDs that are in use
export async function GET() {
  try {
    const schemas = await loadSchemas();
    const usedMediaIds = new Set<string>();

    for (const [collectionSlug] of schemas) {
      const { entries } = await listEntries(collectionSlug, { limit: 10000 });

      for (const entry of entries) {
        getEntryMediaIds(entry).forEach((id) => usedMediaIds.add(id));
      }
    }

    return NextResponse.json({
      usedMediaIds: Array.from(usedMediaIds),
    });
  } catch (error) {
    console.error("Failed to get used media:", error);
    return NextResponse.json(
      { error: "Failed to get used media", usedMediaIds: [] },
      { status: 500 }
    );
  }
}







// POST /api/admin/media/used - {ids, except?: {collection, slug}}: which of
// these media items nothing else uses (`media`, safe to delete) and which
// other posts or pages use (`keptMedia`), leaving out the entry being edited.
export async function POST(request: Request) {
  const body: { ids?: unknown; except?: { collection?: unknown; slug?: unknown } } = await request
    .json()
    .catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
  const except =
    typeof body.except?.collection === "string" && typeof body.except?.slug === "string"
      ? { collection: body.except.collection, slug: body.except.slug }
      : undefined;
  return NextResponse.json({ data: await splitByUse(ids, except) });
}
