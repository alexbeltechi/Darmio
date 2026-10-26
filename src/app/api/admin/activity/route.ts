import { NextResponse } from "next/server";
import { listActivity } from "@/lib/db/activity";

// GET /api/admin/activity?limit=50 - The latest changes to posts and media, newest first.
export async function GET(request: Request) {
  const limit = parseInt(new URL(request.url).searchParams.get("limit") || "50");
  return NextResponse.json({ data: await listActivity(limit) });
}
