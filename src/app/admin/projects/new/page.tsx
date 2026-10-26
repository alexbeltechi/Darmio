"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DsButton, DsField, DsInput, dsToast } from "@beltechi/parabola";
import { PROJECT_NAME_MAX } from "@/lib/cms/projects";
import { PROJECT_START } from "@/components/admin/projects/project-actions";

/**
 * New project: one field, its name (decisions, 2026-10-26). It gets its own
 * database, the admin switches to it and opens on its empty posts; the rest
 * is set later from its settings.
 */
export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetch("/api/admin/projects/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: json.data.slug }),
      });
      window.location.assign(PROJECT_START);
    } catch (error) {
      dsToast.error("Couldn't create the project", { description: error instanceof Error ? error.message : undefined });
      setSaving(false);
    }
  }

  return (
    <div className="flex justify-center px-ds-20 py-ds-80">
      <form onSubmit={create} className="flex w-full max-w-[440px] flex-col gap-ds-40">
        <h1 className="text-h2 text-ds-fg">New project</h1>
        <DsField label="Name" description="A site, a newsletter, a brand. It gets its own posts, library and settings.">
          <DsInput value={name} onChange={(e) => setName(e.target.value)} maxLength={PROJECT_NAME_MAX} placeholder="Studio North" autoFocus />
        </DsField>
        <div className="flex items-center gap-ds-8">
          <DsButton iconLeft={ArrowLeft} type="button" onClick={() => router.back()} disabled={saving}>
            Back
          </DsButton>
          <DsButton variant="primary" type="submit" loading={saving} disabled={!name.trim()}>
            Create project
          </DsButton>
        </div>
      </form>
    </div>
  );
}
