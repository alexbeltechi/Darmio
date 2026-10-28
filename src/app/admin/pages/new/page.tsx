"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";

// In the browser only, like an existing page's editor (which waits for its
// page): Radix selects rendered on the server come up blank after hydration.
const PageEditorForm = dynamic(
  () => import("@/components/admin/page-editor-form").then((m) => m.PageEditorForm),
  { ssr: false }
);

/** A new page, blank or from a preset (`?preset=about`, lib/cms/page-formats.ts). */
function NewPage() {
  const router = useRouter();
  const preset = useSearchParams().get("preset") ?? undefined;
  // Keyed by the preset, so choosing another one starts over.
  return <PageEditorForm key={preset ?? "blank"} preset={preset} onClose={() => router.push("/admin/pages")} />;
}

export default function NewPagePage() {
  return (
    <Suspense>
      <NewPage />
    </Suspense>
  );
}
