import { NextResponse } from "next/server";
import { POST_PAGES } from "@/extensions/post-pages";
import { removeNotedCustomPages } from "@/lib/cms/custom-page-files";

// GET /api/admin/custom-pages - The custom pages this site's code has, by key
// (src/extensions/post-pages.ts). The post editor asks, to say whether a
// post's custom page is really there.
export async function GET() {
  // Code a deployed site couldn't remove when its post was deleted goes now, where it can.
  await removeNotedCustomPages().catch(() => undefined);
  return NextResponse.json({ data: Object.keys(POST_PAGES) });
}
