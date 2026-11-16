import { NextResponse } from "next/server";
import { POST_PAGES } from "@/extensions/post-pages";

// GET /api/admin/custom-pages - The custom pages this site's code has, by key
// (src/extensions/post-pages.ts). The post editor asks, to say whether a
// post's custom page is really there.
export async function GET() {
  return NextResponse.json({ data: Object.keys(POST_PAGES) });
}
