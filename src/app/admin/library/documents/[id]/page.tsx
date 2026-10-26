"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { DsButton } from "@beltechi/parabola";
import { DOCUMENTS_PATH, announceDocsChanged } from "@/components/admin/docs/documents-workspace";
import { DocEditor } from "@/components/admin/docs/doc-editor";
import type { DocWithUsage } from "@/lib/cms/docs";

/** One document in Library › Documents. */
export default function DocPane() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = React.useState<DocWithUsage | null>(null);
  const [missing, setMissing] = React.useState(false);
  const close = () => router.push(DOCUMENTS_PATH);

  React.useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setMissing(false);
    fetch(`/api/admin/docs/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json) setDoc(json.data);
        else setMissing(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (doc) {
    return (
      <DocEditor
        doc={doc}
        onClose={close}
        onSaved={(saved) => {
          setDoc(saved);
          announceDocsChanged();
        }}
        onDeleted={() => {
          announceDocsChanged();
          close();
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-5">
        <DsButton iconLeft={X} aria-label="Close" onClick={close} />
      </div>
      <div className="flex flex-1 items-center justify-center p-5">
        {missing ? (
          <p className="text-p text-ds-fg-muted">This doc doesn&apos;t exist any more.</p>
        ) : (
          <Loader2 aria-label="Loading doc" className="size-6 animate-spin text-ds-fg-subtle" />
        )}
      </div>
    </div>
  );
}
