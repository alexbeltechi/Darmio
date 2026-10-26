import { NextResponse } from "next/server";
import { listEntries, withoutPending } from "@/lib/db/entries";
import { getCollection } from "@/lib/cms/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params;

  const schema = await getCollection(collection);
  if (!schema) {
    return NextResponse.json(
      { error: `Collection "${collection}" not found` },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Only return published entries for public API
  const { entries, total } = await listEntries(collection, {
    status: "published",
    limit,
    offset,
    sortField: schema.admin.defaultSort.field,
    sortDirection: schema.admin.defaultSort.direction,
  });

  return NextResponse.json({
    data: entries.map(withoutPending),
    total,
    limit,
    offset,
  });
}






