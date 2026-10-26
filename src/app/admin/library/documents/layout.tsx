import { DocumentsWorkspace } from "@/components/admin/docs/documents-workspace";

// The documents list stays mounted while documents open and close beside it, as in Posts.
export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return <DocumentsWorkspace>{children}</DocumentsWorkspace>;
}
