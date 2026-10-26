"use client";

import { useRouter } from "next/navigation";
import { PostLoadError } from "@/components/site/post-load-error";

/** The post page's error state when it's opened directly (not from the feed). */
export default function PostError({ reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return <PostLoadError reset={reset} onClose={() => router.push("/")} />;
}
