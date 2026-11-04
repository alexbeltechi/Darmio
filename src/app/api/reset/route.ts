import { NextRequest, NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { getUserByEmail, getUserById, updateUser } from "@/lib/cms/users";
import { isEmail } from "@/lib/cms/email";
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

/**
 * Set a new password with a reset link: `{ token, password }`, and `email`
 * to change the one you sign in with (the link already opens the account,
 * so it can set both; for an account made with a stand-in email, this is
 * the first time its owner sees it). The link works once, and isn't spent
 * on a request that's refused.
 */
export async function POST(request: NextRequest) {
  try {
    const { token, password, email } = await request.json();
    if (typeof password !== "string" || password.length < PASSWORD_MIN) {
      return NextResponse.json({ error: `The new password needs at least ${PASSWORD_MIN} characters` }, { status: 400 });
    }
    const newEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : undefined;
    if (newEmail && !isEmail(newEmail)) return NextResponse.json({ error: "That doesn't look like an email" }, { status: 400 });

    const linkUser = await resetTokenUser(typeof token === "string" ? token : "");
    if (!linkUser) return NextResponse.json({ error: EXPIRED }, { status: 400 });
    if (newEmail) {
      const taken = await getUserByEmail(newEmail);
      if (taken && taken.id !== linkUser) return NextResponse.json({ error: "Another account signs in with that email" }, { status: 400 });
    }

    const userId = await spendResetToken(token);
    if (!userId) return NextResponse.json({ error: EXPIRED }, { status: 400 });

    const result = await updateUser(userId, { password, ...(newEmail ? { email: newEmail } : {}) });
    if (result.error || !result.user) return NextResponse.json({ error: result.error ?? "Couldn't set the password" }, { status: 400 });
    // A locked-out owner is let back in straight away.
    await clearMisses(result.user.email);
    return NextResponse.json({ data: { email: result.user.email } });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Couldn't set the password" }, { status: 500 });
  }
}
