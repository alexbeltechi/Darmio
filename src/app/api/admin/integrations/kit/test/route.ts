import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { getKitStatus } from "@/lib/db/integrations";
import { siteOrigin } from "@/lib/integrations/syndicate";
import { normalizeEmail } from "@/lib/newsletter/email";
import { getListProvider } from "@/lib/newsletter/provider";

// POST /api/admin/integrations/kit/test - Sign up the owner's own address, the
// way a visitor's sign-up would go. That's the signed-in person's sign-in when
// it's an email address; sign-ins can be plain usernames, so otherwise (and
// for an agent token) it's the address of the Kit account the key belongs to.
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const email = normalizeEmail(token?.email) ?? normalizeEmail((await getKitStatus()).account?.email);
    if (!email) return NextResponse.json({ error: "No address to send a test to: the Kit account has no email" }, { status: 400 });

    const provider = await getListProvider();
    if (!provider) return NextResponse.json({ error: "Pick a form first" }, { status: 400 });
    await provider.subscribe(email, { source: `${siteOrigin(request.url)}/admin/settings` });
    return NextResponse.json({ data: { ok: true, email } });
  } catch (error) {
    console.error("Kit test sign-up failed:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "The test sign-up failed" }, { status: 502 });
  }
}
