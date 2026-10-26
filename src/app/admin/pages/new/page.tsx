"use client";

import { useRouter } from "next/navigation";
import { PageEditorForm } from "@/components/admin/page-editor-form";

export default function NewPagePage() {
  const router = useRouter();
  return <PageEditorForm onClose={() => router.push("/admin/pages")} />;
}
