import { NextResponse } from "next/server";
import { listEntries } from "@/lib/db/entries";
import { loadSchemas } from "@/lib/cms/schema";
import { getEntryMediaIds } from "@/lib/cms/entry-media";

interface UsageInfo {
  collection: string;
  slug: string;
  title: string;
}

// GET /api/admin/media/[id]/usage - Get all entries using this media
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: mediaId } = await params;
    const schemas = await loadSchemas();
    const usages: UsageInfo[] = [];

    for (const [collectionSlug] of schemas) {
      const { entries } = await listEntries(collectionSlug, { limit: 10000 });

      for (const entry of entries) {
        const isUsed = getEntryMediaIds(entry).includes(mediaId);

        if (isUsed) {
          usages.push({
            collection: collectionSlug,
            slug: entry.slug,
            title: (entry.data.title as string) || entry.slug,
          });
        }
      }
    }

    return NextResponse.json({ usages });
  } catch (error) {
    console.error("Failed to get media usage:", error);
    return NextResponse.json(
      { error: "Failed to get media usage", usages: [] },
      { status: 500 }
    );
  }
}






