import { NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { installUsage } from "@/lib/db/install";

/** What the install runs on (hosting, database, image storage) and how much every project uses of it. */
export async function GET() {
  try {
    return NextResponse.json({ data: await installUsage() });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Couldn't read the install's usage" }, { status: 500 });
  }
}
