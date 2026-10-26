import { NextRequest, NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { getUserById, updateUser } from "@/lib/cms/users";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { resetTokenUser, spendResetToken } from "@/lib/db/password-resets";
import { clearMisses } from "@/lib/db/login-attempts";

const EXPIRED = "That reset link didn't work. It may have expired or been used: ask your AI for a new one.";

/** Is this reset link still good? `{ ok, email }`, so the page can say whose password it sets. */
export async function GET(request: NextRequest) {
  try {
    const userId = await resetTokenUser(request.nextUrl.searchParams.get("token") ?? "");
    const user = userId ? await getUserById(userId) : null;
    return NextResponse.json({ data: user ? { ok: true, email: user.email } : { ok: false } });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Couldn't check the link" }, { status: 500 });
  }
}

/** Set a new password with a reset link: `{ token, password }`. The link works once. */
export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (typeof password !== "string" || password.length < PASSWORD_MIN) {
      return NextResponse.json({ error: `The new password needs at least ${PASSWORD_MIN} characters` }, { status: 400 });
    }
    const userId = await spendResetToken(typeof token === "string" ? token : "");
    if (!userId) return NextResponse.json({ error: EXPIRED }, { status: 400 });

    const result = await updateUser(userId, { password });
    if (result.error || !result.user) return NextResponse.json({ error: result.error ?? "Couldn't set the password" }, { status: 400 });
    // A locked-out owner is let back in straight away.
    await clearMisses(result.user.email);
    return NextResponse.json({ data: { email: result.user.email } });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Couldn't set the password" }, { status: 500 });
  }
}
