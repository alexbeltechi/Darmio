import { NextRequest, NextResponse } from "next/server";
import { updateMedia } from "@/lib/cms/media";
import type { MediaItem } from "@/lib/cms/types";
import { getActor } from "@/lib/agent/actor";
import { logActivity } from "@/lib/db/activity";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, updates } = body as {
      ids: string[];
      updates: Partial<MediaItem>;
    };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Media IDs are required" },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json(
        { error: "Updates object is required" },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;

    for (const id of ids) {
      try {
        const result = await updateMedia(id, updates);
        if (result.item) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to update ${id}:`, result.error);
        }
      } catch (error) {
        errorCount++;
        console.error(`Error updating ${id}:`, error);
      }
    }

    await logActivity({
      actor: getActor(request),
      action: "media.edit",
      target: ids.join(","),
      label: `${successCount} files`,
      detail: `fields: ${Object.keys(updates).join(", ")}`,
    });

    return NextResponse.json({
      success: true,
      modifiedCount: successCount,
      errorCount,
    });
  } catch (error) {
    console.error("Bulk update media error:", error);
    return NextResponse.json(
      { error: "Failed to update media" },
      { status: 500 }
    );
  }
}

