import { notFound } from "next/navigation";
import { getEntry, withoutPending } from "@/lib/db/entries";
import { listCategories } from "@/lib/db/categories";
import { getSiteSettings } from "@/lib/db/settings";
import { PostView } from "@/components/site/post-view";

// Use ISR - regenerate every 60 seconds for instant navigation
export const revalidate = 60;

interface PostPageProps {
  params: Promise<{ slug: string }>;
}

/** The public post page: the live version only. */
export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  const [post, allCategories, settings] = await Promise.all([
    getEntry("posts", slug).then((entry) => entry && withoutPending(entry)),
    listCategories(),
    getSiteSettings(),
  ]);
  if (!post || post.status !== "published") notFound();

  return <PostView post={post} allCategories={allCategories} settings={settings} />;
}
