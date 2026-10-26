import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/agent/actor";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { isEmail } from "@/lib/cms/email";
import { getUserByEmail, getUserById, updateUser, verifyPassword } from "@/lib/cms/users";

/** The signed-in person's account. Agents (a bearer token) have none. */
export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Agents don't have an account" }, { status: 403 });

  try {
    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    const { id, name, email, role } = user;
    return NextResponse.json({ data: { id, name, email, role } });
  } catch (error) {
    console.error("Failed to read account:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Failed to read account" }, { status: 500 });
  }
}

/**
 * Change the signed-in person's name, `{ name }` (optional, "" for none),
 * the email they sign in with, `{ newEmail, currentPassword }`, or their
 * password, `{ currentPassword, newPassword }`. Darmio can't send email
 * yet, so a new email isn't confirmed by a link; the password stands in.
 */
export async function PATCH(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: "Agents don't have an account" }, { status: 403 });

  try {
    const body = await request.json();

    if (typeof body.newEmail === "string") {
      const newEmail = body.newEmail.trim().toLowerCase();
      if (!isEmail(newEmail)) return NextResponse.json({ error: "That doesn't look like an email" }, { status: 400 });
      const safe = await getUserById(userId);
      const user = safe && (await getUserByEmail(safe.email));
      if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
      if (!(await verifyPassword(user, typeof body.currentPassword === "string" ? body.currentPassword : ""))) {
        return NextResponse.json({ error: "The password is wrong" }, { status: 400 });
      }
      const result = await updateUser(user.id, { email: newEmail });
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ data: { email: newEmail } });
    }

    if (typeof body.name === "string" && body.newPassword === undefined) {
      const name = body.name.trim();
      if (name.length > 80) return NextResponse.json({ error: "A name can be at most 80 characters" }, { status: 400 });
      const result = await updateUser(userId, { name });
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ data: { name } });
    }

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (newPassword.length < PASSWORD_MIN || newPassword.length > 200) {
      return NextResponse.json(
        { error: `The new password needs ${PASSWORD_MIN} to 200 characters` },
        { status: 400 }
      );
    }

    const safe = await getUserById(userId);
    const user = safe && (await getUserByEmail(safe.email));
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    if (!(await verifyPassword(user, currentPassword))) {
      return NextResponse.json({ error: "The current password is wrong" }, { status: 400 });
    }

    const result = await updateUser(user.id, { password: newPassword });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ data: { updatedAt: result.user?.updatedAt } });
  } catch (error) {
    console.error("Failed to update the account:", error);
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Failed to update the account" }, { status: 500 });
  }
}
