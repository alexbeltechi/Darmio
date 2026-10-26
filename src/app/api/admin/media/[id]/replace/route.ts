import { NextResponse } from "next/server";
import { uploadMedia, deleteMedia, getMedia, replaceMediaReferences } from "@/lib/cms/media";
import type { UploadMetadata } from "@/lib/cms/types";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";

// POST /api/admin/media/[id]/replace - Replace media file and update all references
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: oldMediaId } = await params;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // A replacement is the same picture, better: it keeps the old item's words
    // and dates, and any field sent with the file wins.
    const old = await getMedia(oldMediaId);
    const str = (key: string) => {
      const value = formData.get(key);
      return typeof value === "string" && value.trim() ? value.trim() : undefined;
    };
    const list = (key: string) => str(key)?.split(",").map((w) => w.trim()).filter(Boolean);
    const meta: UploadMetadata = {
      title: str("title") ?? old?.title,
      alt: str("alt") ?? old?.alt,
      caption: str("caption") ?? old?.caption,
      description: str("description") ?? old?.description,
      credit: str("credit") ?? old?.credit,
      tags: list("tags") ?? old?.tags,
      keywords: list("keywords") ?? old?.keywords,
      keywordsBy: str("keywordsBy") ?? old?.keywordsFrom?.by,
      capturedAt: str("capturedAt") ?? old?.createdAt,
      source: str("sourcePath") ? { ...old?.source, origin: old?.source?.origin ?? "agent", path: str("sourcePath") } : old?.source,
    };

    const uploadResult = await uploadMedia(buffer, file.name, file.type, meta);

    if (uploadResult.error || !uploadResult.item) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to upload file" },
        { status: 400 }
      );
    }

    const newMediaId = uploadResult.item.id;
    // The same bytes again: nothing to swap, and deleting the "old" item would delete the only one.
    if (newMediaId === oldMediaId) {
      return NextResponse.json({ data: uploadResult.item, updatedEntries: 0 });
    }

    // 2. Replace all references from old ID to new ID
    const { updatedCount } = await replaceMediaReferences(oldMediaId, newMediaId);

    await deleteMedia(oldMediaId);

    await logActivity({
      actor: getActor(request),
      action: "media.replace",
      target: newMediaId,
      label: uploadResult.item.originalName,
      detail: `replaced ${oldMediaId}${updatedCount ? ` in ${updatedCount} posts` : ""}`,
    });

    return NextResponse.json({
      data: uploadResult.item,
      updatedEntries: updatedCount,
    });
  } catch (error) {
    console.error("Replace error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Failed to replace file: ${errorMessage}` },
      { status: 500 }
    );
  }
}

