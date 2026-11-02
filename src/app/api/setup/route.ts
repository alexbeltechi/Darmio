import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { isEmail } from "@/lib/cms/email";
import { parseBrain, parseProjectName, PROJECTS_MAX } from "@/lib/cms/projects";
import { createUser, hasUsers } from "@/lib/cms/users";
import { listExampleSites, loadExampleSite, parseExampleName } from "@/lib/cms/examples";
import { createProject } from "@/lib/db/projects";
import { DEFAULT_SETTINGS } from "@/lib/db/settings";
import { hasSetupCode, setupCodeMatches } from "@/lib/setup-code";

// Starting from an example site makes a few image renditions and a video poster.
export const maxDuration = 60;

/**
 * First-run setup, public by design: it only works while the install has no
 * users, and only with the install's one-time setup code (SETUP_CODE, in the
 * setup link the installer hands over), so it creates the owner exactly once
 * and only for whoever holds the link. After that it answers 409 and the
 * login page takes over. INSTALL.md is the full guide for an AI.
 */

// The short version of INSTALL.md, for an AI that only has this install's address.
const AGENT_GUIDE = `Set up this Darmio install. You need its setup code (SETUP_CODE in its
environment). Best: give the owner the link /admin/setup?code=<code> and let them finish there,
so their password never passes through you. Or ask them for: their email and a password
of at least ${PASSWORD_MIN} characters. Projects are optional: one called "My site" is made if you
send none, and they rename it under Settings › Site. If they told you their brand: a name
each (a site, a newsletter, a brand), and, if they have one, a brain for it (a folder or link
with what an agent should know first). To start the first project as an example site they can
remove later (Settings › Examples), add "example" with one of the names in this answer's
"examples". Then POST /api/setup with JSON:

{
  "code": "<SETUP_CODE>",
  "email": "them@example.com",
  "password": "…",
  "projects": [{ "name": "First project", "brain": "optional folder or link" }],
  "example": "optional, e.g. the first of examples"
}

The first project opens first. It works once, while the install has no users; afterwards they
sign in at /admin/login and add more projects from the menu behind the letter in the admin.`;

/**
 * Whether this install still needs its owner, whether it has a setup code at
 * all, whether `?code=` is it, the example sites it can start as, and how an
 * agent sets it up.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    return NextResponse.json({
      data: {
        needed: !(await hasUsers()),
        hasCode: hasSetupCode(),
        ...(code !== null ? { codeOk: setupCodeMatches(code) } : {}),
        examples: await listExampleSites(),
        guide: AGENT_GUIDE,
      },
    });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Couldn't check the setup" }, { status: 500 });
  }
}

/**
 * Create the owner and their first project(s): `{ code, email, password,
 * projects?: [{ name, brain? }], name?, example? }`. No projects makes one
 * called "My site", renamed later under Settings › Site. `example` loads that
 * example site into the first project; the account stands even if that
 * fails (`exampleError`), and Settings › Examples can load it again.
 */
export async function POST(request: NextRequest) {
  try {
    if (await hasUsers()) {
      return NextResponse.json({ error: "This install is already set up. Sign in instead." }, { status: 409 });
    }

    const body = await request.json();
    if (!hasSetupCode()) {
      return NextResponse.json({ error: "This install has no setup code yet (SETUP_CODE). See INSTALL.md." }, { status: 403 });
    }
    if (!setupCodeMatches(body.code)) {
      return NextResponse.json({ error: "That setup code isn't right. Open the setup link you were given." }, { status: 403 });
    }
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const projects = Array.isArray(body.projects) ? body.projects : [];
    const example = body.example === undefined || body.example === null || body.example === "" ? null : await parseExampleName(body.example);

    // Optional: an account is its email until its owner adds a name (Settings › Account).
    if (name.length > 80) return NextResponse.json({ error: "A name can be at most 80 characters" }, { status: 400 });
    if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    if (password.length < PASSWORD_MIN || password.length > 200) {
      return NextResponse.json({ error: `The password needs ${PASSWORD_MIN} to 200 characters` }, { status: 400 });
    }
    if (projects.length > PROJECTS_MAX) {
      return NextResponse.json({ error: `At most ${PROJECTS_MAX} projects` }, { status: 400 });
    }
    // Check every project before creating anything, so a bad one doesn't leave half a setup.
    const clean = projects.length
      ? projects.map((p: { name?: unknown; brain?: unknown }) => ({ name: parseProjectName(p?.name), brain: parseBrain(p?.brain) }))
      : [{ name: DEFAULT_SETTINGS.siteName }];

    const result = await createUser({ email, name, password, role: "owner" });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    for (const project of clean) await createProject(project);

    // The first project is the one a request without a project header reads and writes.
    let exampleError: string | undefined;
    if (example) {
      try {
        await loadExampleSite(example);
        revalidatePath("/", "layout");
      } catch (error) {
        console.error("Setup: couldn't load the example site:", error);
        if (error instanceof Error && /already in progress/i.test(error.message)) {
          exampleError = "Another example load is already in progress. Try again in a moment.";
        } else {
          exampleError = error instanceof Error ? error.message : "Couldn't load the example site";
        }
      }
    }

    return NextResponse.json({ data: { email, ...(exampleError ? { exampleError } : {}) } }, { status: 201 });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't set up" }, { status: 400 });
  }
}
