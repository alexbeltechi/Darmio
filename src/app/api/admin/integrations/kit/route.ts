import { NextRequest, NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { deleteKit, getKitStatus, saveKitChoice, saveKitKey } from "@/lib/db/integrations";
import { KitAuthError, kitAccount } from "@/lib/newsletter/kit";
import type { KitOption } from "@/lib/newsletter/types";

// GET /api/admin/integrations/kit - How Kit is set up (never the key).
export async function GET() {
  try {
    return NextResponse.json({ data: await getKitStatus() });
  } catch (error) {
    console.error("Failed to read the Kit settings:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Failed to read the Kit settings" }, { status: 500 });
  }
}

// PUT /api/admin/integrations/kit - { apiKey }. Check the key with Kit, then store it encrypted.
export async function PUT(request: NextRequest) {
  let apiKey: unknown;
  try {
    ({ apiKey } = await request.json());
  } catch {
    // Handled below.
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  try {
    const account = await kitAccount(apiKey.trim());
    return NextResponse.json({ data: await saveKitKey(apiKey.trim(), account) });
  } catch (error) {
    if (error instanceof KitAuthError) {
      return NextResponse.json({ error: "Kit didn't accept that key. Copy a v4 API key from Kit's developer settings." }, { status: 400 });
    }
    console.error("Failed to save the Kit key:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save the Kit key" }, { status: 502 });
  }
}

function option(value: unknown, what: string): KitOption | null {
  if (value === null) return null;
  const v = value as { id?: unknown; name?: unknown };
  if (typeof v?.id !== "number" || typeof v?.name !== "string") throw new Error(`${what} must be { id, name } or null`);
  return { id: v.id, name: v.name };
}

// PATCH /api/admin/integrations/kit - { form?, tag? } as { id, name } or null: which form sign-ups join and which tag they get.
export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  try {
    const choice: { form?: KitOption | null; tag?: KitOption | null } = {};
    if ("form" in body) choice.form = option(body.form, "form");
    if ("tag" in body) choice.tag = option(body.tag, "tag");
    return NextResponse.json({ data: await saveKitChoice(choice) });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save" }, { status: 400 });
  }
}

// DELETE /api/admin/integrations/kit - Forget the key, form and tag. The key stays valid in Kit until revoked there.
export async function DELETE() {
  try {
    await deleteKit();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Failed to disconnect Kit" }, { status: 500 });
  }
}
