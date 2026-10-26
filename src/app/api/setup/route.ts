import { NextRequest, NextResponse } from "next/server";
import { handleDatabaseError, isDatabaseError } from "@/lib/api/error-handler";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { isEmail } from "@/lib/cms/email";
import { parseBrain, parseProjectName, PROJECTS_MAX } from "@/lib/cms/projects";
import { createUser, hasUsers } from "@/lib/cms/users";
import { createProject } from "@/lib/db/projects";

/**
 * First-run setup, public by design: it only works while the install has no
 * users, so it can create the owner exactly once. After that it answers 409
 * and the login page takes over. An agent can do the setup by reading GET.
 */

// The short version of SETUP.md, for an AI that only has this install's address.
const AGENT_GUIDE = `Set up this Dharmify install. Ask the owner for: their email and a password
of at least ${PASSWORD_MIN} characters, and their projects: a name
each (a site, a newsletter, a brand), and, if they have one, a brain for it (a folder or link
with what an agent should know first). Then POST /api/setup with JSON:

{
  "email": "them@example.com",
  "password": "…",
  "projects": [{ "name": "First project", "brain": "optional folder or link" }]
}

The first project opens first. It works once, while the install has no users; afterwards they
sign in at /admin/login and add more projects from the menu behind the letter in the admin.`;

/** Whether this install still needs its owner, and how an agent sets it up. */
export async function GET() {
  try {
    return NextResponse.json({ data: { needed: !(await hasUsers()), guide: AGENT_GUIDE } });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: "Couldn't check the setup" }, { status: 500 });
  }
}

/** Create the owner and the projects: `{ email, password, projects: [{ name, brain? }], name? }`. */
export async function POST(request: NextRequest) {
  try {
    if (await hasUsers()) {
      return NextResponse.json({ error: "This install is already set up. Sign in instead." }, { status: 409 });
    }

    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const projects = Array.isArray(body.projects) ? body.projects : [];

    // Optional: an account is its email until its owner adds a name (Settings › Account).
    if (name.length > 80) return NextResponse.json({ error: "A name can be at most 80 characters" }, { status: 400 });
    if (!isEmail(email)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
    if (password.length < PASSWORD_MIN || password.length > 200) {
      return NextResponse.json({ error: `The password needs ${PASSWORD_MIN} to 200 characters` }, { status: 400 });
    }
    if (projects.length < 1 || projects.length > PROJECTS_MAX) {
      return NextResponse.json({ error: `Add between 1 and ${PROJECTS_MAX} projects` }, { status: 400 });
    }
    // Check every project before creating anything, so a bad one doesn't leave half a setup.
    const clean = projects.map((p: { name?: unknown; brain?: unknown }) => ({ name: parseProjectName(p?.name), brain: parseBrain(p?.brain) }));

    const result = await createUser({ email, name, password, role: "owner" });
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
    for (const project of clean) await createProject(project);

    return NextResponse.json({ data: { email } }, { status: 201 });
  } catch (error) {
    if (isDatabaseError(error)) return handleDatabaseError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Couldn't set up" }, { status: 400 });
  }
}
