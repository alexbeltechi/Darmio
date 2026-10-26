import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEntry } from "@/lib/db/entries";
import { listCategories } from "@/lib/db/categories";
import { getSiteSettings } from "@/lib/db/settings";
import { PostView } from "@/components/site/post-view";
import type { Entry } from "@/lib/cms/types";

// Per request, never cached: it shows unpublished work, and only to the admin.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The admin's preview of a post as it's being edited: drafts, and published
 * posts with their unpublished changes laid over the live version. Anyone not
 * signed in to the admin gets a 404, so unpublished work stays private.
 */
export default async function PostPreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) notFound();

  const { slug } = await params;
  const [entry, allCategories, settings] = await Promise.all([
    getEntry("posts", slug),
    listCategories(),
    getSiteSettings(),
  ]);
  if (!entry) notFound();

  const post = { ...entry, data: { ...entry.data, ...entry.pendingData } } as Entry;
  return <PostView post={post} allCategories={allCategories} settings={settings} preview />;
}
