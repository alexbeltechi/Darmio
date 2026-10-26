import { NextResponse } from "next/server";
import { deleteConnection } from "@/lib/db/integrations";
import { isPlatform } from "@/lib/integrations/types";

// DELETE /api/admin/integrations/[platform] - Disconnect. Forgets the tokens here;
// the app stays authorised on the platform until removed in its own settings.
export async function DELETE(_request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 404 });
  }
  await deleteConnection(platform);
  return NextResponse.json({ success: true });
}
