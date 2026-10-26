import { PostsWorkspace } from "@/components/admin/posts/posts-workspace";

// The posts list stays mounted while posts open and close beside it.
export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return <PostsWorkspace>{children}</PostsWorkspace>;
}
