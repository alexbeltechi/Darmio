import { PagesWorkspace } from "@/components/admin/pages/pages-workspace";

// The pages list stays mounted while pages open and close beside it, as in Posts.
export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return <PagesWorkspace>{children}</PagesWorkspace>;
}
