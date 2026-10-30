"use client";

import { useEffect, useState } from "react";
import { DsButton, DsField, DsInput, dsToast } from "@beltechi/parabola";
import { SITE_NAME_MAX } from "@/lib/cms/site";
import { announceSiteSettingsChanged } from "@/components/admin/use-site-settings";
import { useCurrentProject } from "@/components/admin/use-current-project";
import { SettingsLink, SettingsSection } from "./settings-section";

type Form = { siteName: string };

const toForm = (siteName: string): Form => ({ siteName });

/**
 * The project: its name (the admin's tile, the project menu, the site's logo,
 * the footer, browser titles), and whether its site is published and where.
 * The homepage's own words are a page, not a setting.
 */
export function SiteSettings() {
  const { current } = useCurrentProject();
  const [address, setAddress] = useState("");
  useEffect(() => setAddress(window.location.host), []);
  const [saved, setSaved] = useState<Form | null>(null);
  const [form, setForm] = useState<Form>(toForm(""));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((json) => {
        const current = toForm(json.data?.siteName ?? "");
        setSaved(current);
        setForm(current);
      })
      .catch(() => setSaved(toForm("")));
  }, []);

  const dirty = saved !== null && JSON.stringify(form) !== JSON.stringify(saved);
  const set = (changes: Partial<Form>) => setForm({ ...form, ...changes });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName: form.siteName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const next = toForm(json.data.siteName);
      setSaved(next);
      setForm(next);
      announceSiteSettingsChanged();
      dsToast.success("Project saved");
    } catch (error) {
      dsToast.error("Couldn't save the project", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      id="site"
      title="Project"
      description={
        current &&
        (current.onSite ? (
          address ? (
            <>
              Published at <SettingsLink href="/">{address}</SettingsLink>
            </>
          ) : (
            "Published"
          )
        ) : (
          "Not published"
        ))
      }
      note={current && !current.onSite && "Your site shows your first project for now."}
    >
      <form onSubmit={save} className="flex flex-col gap-5">
        <DsField
          label="Name"
          description="The project's name, and the site's."
        >
          <DsInput
            value={form.siteName}
            onChange={(e) => set({ siteName: e.target.value })}
            maxLength={SITE_NAME_MAX}
            disabled={saved === null}
            placeholder="Your name or your brand"
          />
        </DsField>
        <DsButton type="submit" variant="primary" disabled={!dirty || saving} loading={saving} className="self-start">
          Save
        </DsButton>
      </form>
    </SettingsSection>
  );
}
