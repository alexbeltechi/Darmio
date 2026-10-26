import { NextRequest, NextResponse } from "next/server";
import { getConnectionStatuses, verifyConnections } from "@/lib/db/integrations";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";

// GET /api/admin/integrations - Connection status per platform (never tokens).
// `?verify=1` also checks each token with its platform, catching ones revoked there.
export async function GET(request: NextRequest) {
  try {
    const verify = request.nextUrl.searchParams.get("verify") === "1";
    const data = verify ? await verifyConnections() : await getConnectionStatuses();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to read integrations:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Failed to read integrations" }, { status: 500 });
  }
}
