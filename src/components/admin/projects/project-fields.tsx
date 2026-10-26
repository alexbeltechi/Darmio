"use client";

import { DsField, DsInput } from "@beltechi/parabola";
import { PROJECT_NAME_MAX } from "@/lib/cms/projects";

export type ProjectDraft = { name: string; brain: string };

/** A project's name and its brain, shared by the onboarding and Add project. */
export function ProjectFields({
  draft,
  onChange,
  autoFocus,
}: {
  draft: ProjectDraft;
  onChange: (draft: ProjectDraft) => void;
  autoFocus?: boolean;
}) {
  return (
    <>
      <DsField label="Project name" description="A site, a newsletter, a brand: whatever you publish under one name.">
        <DsInput
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          maxLength={PROJECT_NAME_MAX}
          placeholder="Studio North"
          autoFocus={autoFocus}
        />
      </DsField>
      <DsField
        label="Brain (optional)"
        description="Do you have a brain for this project? A folder or link with what your agent should know first: who it's for, its voice, what's decided. Your agent reads it before working here."
      >
        <DsInput
          value={draft.brain}
          onChange={(e) => onChange({ ...draft, brain: e.target.value })}
          placeholder="~/Documents/brain or a link"
        />
      </DsField>
    </>
  );
}
