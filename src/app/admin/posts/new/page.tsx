"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { usePostsWorkspace } from "@/components/admin/posts/posts-workspace";

function NewPostEditor() {
  const searchParams = useSearchParams();
  const mediaIds = searchParams.get("media")?.split(",").filter(Boolean) || [];
  const { refresh, closePost } = usePostsWorkspace();

  return <PostEditorForm preSelectedMediaIds={mediaIds} onClose={closePost} onSaved={refresh} />;
}

export default function NewPostPage() {
  return (
    <Suspense>
      <NewPostEditor />
    </Suspense>
  );
}
