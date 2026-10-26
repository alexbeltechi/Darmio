import { NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { getKitConfig, markKitRejected } from "@/lib/db/integrations";
import { KitAuthError, kitForms, kitTags } from "@/lib/newsletter/kit";

// GET /api/admin/integrations/kit/options - The account's forms and tags, read from Kit, to pick from.
export async function GET() {
  try {
    const kit = await getKitConfig();
    if (!kit) return NextResponse.json({ error: "Paste a Kit API key first" }, { status: 400 });
    const [forms, tags] = await Promise.all([kitForms(kit.apiKey), kitTags(kit.apiKey)]);
    return NextResponse.json({ data: { forms, tags } });
  } catch (error) {
    if (error instanceof KitAuthError) {
      await markKitRejected(error.message);
      return NextResponse.json({ error: "Kit rejected the API key; paste it again" }, { status: 400 });
    }
    console.error("Failed to read Kit forms and tags:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to read from Kit" }, { status: 502 });
  }
}
