"use client";

import { useParams, useRouter } from "next/navigation";
import { PageEditorForm } from "@/components/admin/page-editor-form";

export default function EditPagePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  // Keyed by slug so moving between pages starts each editor fresh.
  return <PageEditorForm key={slug} slug={slug} onClose={() => router.push("/admin/pages")} />;
}
