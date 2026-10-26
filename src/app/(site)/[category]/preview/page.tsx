import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEntry } from "@/lib/db/entries";
import { PageView } from "@/components/site/page-view";
import type { Entry } from "@/lib/cms/types";

// Per request, never cached: it shows unpublished work, and only to the admin.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The admin's preview of a page as it's being edited: drafts, and published
 * pages with their unpublished changes over the live version. Anyone not
 * signed in to the admin gets a 404.
 */
export default async function PagePreview({ params }: { params: Promise<{ category: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) notFound();

  const entry = await getEntry("pages", (await params).category);
  if (!entry) notFound();

  const page = { ...entry, data: { ...entry.data, ...entry.pendingData } } as Entry;
  return <PageView page={page} preview />;
}
