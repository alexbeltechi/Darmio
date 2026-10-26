"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { DsButton, dsToast } from "@beltechi/parabola";
import { ProjectFields, type ProjectDraft } from "@/components/admin/projects/project-fields";

/**
 * Add a project: its name and brain, the same fields as the onboarding.
 * It gets its own database, and the admin switches to it.
 */
export default function NewProjectPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ProjectDraft>({ name: "", brain: "" });
  const [saving, setSaving] = useState(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await fetch("/api/admin/projects/current", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: json.data.slug }),
      });
      window.location.assign("/admin");
    } catch (error) {
      dsToast.error("Couldn't add the project", { description: error instanceof Error ? error.message : undefined });
      setSaving(false);
    }
  }

  return (
    <div className="flex justify-center px-ds-20 py-ds-80">
      <form onSubmit={create} className="flex w-full max-w-[440px] flex-col gap-ds-40">
        <div className="flex flex-col gap-ds-8">
          <h1 className="text-h2 text-ds-fg">New project</h1>
          <p className="text-p text-ds-fg-muted">
            Its own posts, pages, library and settings, in its own database. Switch between projects from the letter at the top left.
          </p>
        </div>
        <div className="flex flex-col gap-ds-20">
          <ProjectFields draft={draft} onChange={setDraft} autoFocus />
        </div>
        <div className="flex items-center justify-between gap-ds-8">
          <DsButton iconLeft={ArrowLeft} type="button" onClick={() => router.back()} disabled={saving}>
            Back
          </DsButton>
          <DsButton variant="primary" type="submit" iconLeft={Check} loading={saving} disabled={!draft.name.trim()}>
            Create project
          </DsButton>
        </div>
      </form>
    </div>
  );
}
