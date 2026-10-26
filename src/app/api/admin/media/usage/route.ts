import { NextResponse } from "next/server";
import { mediaStorageUsage } from "@/lib/db/media";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";

// GET /api/admin/media/usage - Bytes the media library takes in storage
export async function GET() {
  try {
    return NextResponse.json({ data: await mediaStorageUsage() });
  } catch (error) {
    console.error("Failed to read media usage:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Failed to read media usage" }, { status: 500 });
  }
}
