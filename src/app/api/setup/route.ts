import { NextRequest, NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { parseSiteName } from "@/lib/cms/site";
import { createUser, hasUsers } from "@/lib/cms/users";
import { updateSiteSettings } from "@/lib/db/settings";

/**
 * First-run setup, public by design: it only works while the database has no
 * users, so it can create the owner exactly once. After that it answers 409
 * and the login page takes over.
 */

/** Whether this install still needs its owner. */
export async function GET() {
  try {
    return NextResponse.json({ data: { needed: !(await hasUsers()) } });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Couldn't check the setup" }, { status: 500 });
  }
}

/** Create the owner and name the site: `{ siteName, name, username, password }`. */
export async function POST(request: NextRequest) {
  try {
    if (await hasUsers()) {
      return NextResponse.json({ error: "This site is already set up. Sign in instead." }, { status: 409 });
    }

    const body = await request.json();
    const siteName = parseSiteName(body.siteName);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || name.length > 80) return NextResponse.json({ error: "Your name needs 1–80 characters" }, { status: 400 });
    if (!/^[^\s]{3,100}$/.test(username)) {
      return NextResponse.json({ error: "The username needs 3–100 characters, no spaces (an email works)" }, { status: 400 });
    }
    if (password.length < PASSWORD_MIN || password.length > 200) {
      return NextResponse.json({ error: `The password needs ${PASSWORD_MIN} to 200 characters` }, { status: 400 });
    }

    const result = await createUser({ email: username, name, password, role: "owner" });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    await updateSiteSettings({ siteName });

    return NextResponse.json({ data: { username } }, { status: 201 });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't set up the site" },
      { status: 400 }
    );
  }
}
