"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Plus } from "lucide-react";
import { DsButton, DsListRow, dsToast } from "@beltechi/parabola";
import { DOCUMENTS_PATH } from "@/components/admin/docs/documents-workspace";
import { mdName, shortDate, type DocWithUsage } from "@/lib/cms/docs";
import { SettingsSection } from "./settings-section";

/**
 * Settings › Agent: the rules every agent reads before working on this site
 * (documents of kind "guide", kept in Library › Documents), and the API guide
 * agents start from. Briefs and sources stay with their posts and pages.
 */
export function AgentSettings() {
  const router = useRouter();
  const [rules, setRules] = useState<DocWithUsage[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/admin/docs")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setRules(((json?.data as DocWithUsage[]) || []).filter((d) => d.kind === "guide")))
      .catch(() => setRules([]));
  }, []);

  async function addRule() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "rules.md", kind: "guide", body: "" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push(`${DOCUMENTS_PATH}/${json.data.id}`);
    } catch (error) {
      dsToast("Couldn't add the rule", { description: error instanceof Error ? error.message : undefined });
      setCreating(false);
    }
  }

  return (
    <SettingsSection
      id="agent"
      title="Agent"
      description="Rules your agent reads before it works on this site: your voice, what never to do, how you like things named. They're documents in the Library."
    >
      {rules === null ? null : rules.length === 0 ? (
        <p className="text-p text-ds-fg-muted">No rules yet.</p>
      ) : (
        <ul className="flex flex-col">
          {rules.map((doc) => (
            <li key={doc.id}>
              <DsListRow
                href={`${DOCUMENTS_PATH}/${doc.id}`}
                thumbnailIcon={FileText}
                title={mdName(doc)}
                detail={`${doc.createdBy === "agent" ? "By your agent · " : ""}${shortDate(doc.updatedAt)}`}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <DsButton iconLeft={Plus} loading={creating} onClick={addRule}>
          Add a rule
        </DsButton>
        <DsButton iconRight={ExternalLink} href="/api/admin/agent" target="_blank" rel="noopener noreferrer">
          What agents read first
        </DsButton>
      </div>
    </SettingsSection>
  );
}
