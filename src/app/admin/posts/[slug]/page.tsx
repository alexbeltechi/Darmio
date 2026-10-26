"use client";

import { useParams } from "next/navigation";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { usePostsWorkspace } from "@/components/admin/posts/posts-workspace";

export default function EditPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { refresh, closePost } = usePostsWorkspace();

  // Keyed by slug so moving between posts starts each editor fresh.
  return <PostEditorForm key={slug} slug={slug} onClose={closePost} onSaved={refresh} />;
}
