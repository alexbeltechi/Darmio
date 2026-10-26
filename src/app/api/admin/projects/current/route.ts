import { NextRequest, NextResponse } from "next/server";
import { hubProjects } from "@/lib/db/mongodb";
import { PROJECT_COOKIE } from "@/lib/cms/projects";

/** Switch the admin to another project: `{ slug }`. Remembered in this browser. */
export async function POST(request: NextRequest) {
  const { slug } = await request.json();
  const project = (await hubProjects({ fresh: true })).find((p) => p.slug === slug);
  if (!project) return NextResponse.json({ error: `No project "${slug}"` }, { status: 404 });

  const response = NextResponse.json({ data: { current: project.slug } });
  response.cookies.set(PROJECT_COOKIE, project.slug, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
