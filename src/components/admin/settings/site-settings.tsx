"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DS_FIELDS_CLASS, DsButton, DsField, DsInput, dsToast } from "@beltechi/parabola";
import { SITE_NAME_MAX, siteInitial } from "@/lib/cms/site";
import { announceSiteSettingsChanged } from "@/components/admin/use-site-settings";
import { SettingsSection } from "./settings-section";

/**
 * The site's name: the brand the admin's mark, the site's logo, the footer
 * and browser titles draw from (decisions, 2026-10-24).
 */
export function SiteSettings() {
  const [saved, setSaved] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((json) => {
        const current = typeof json.data?.siteName === "string" ? json.data.siteName : "";
        setSaved(current);
        setName(current);
      })
      .catch(() => setSaved(""));
  }, []);

  const dirty = saved !== null && name.trim() !== saved;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName: name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSaved(json.data.siteName);
      setName(json.data.siteName);
      announceSiteSettingsChanged();
      dsToast.success(`The site is now called ${json.data.siteName}`);
    } catch (error) {
      dsToast.error("Couldn't save the site name", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      id="site"
      title="Site"
      description="The name behind the mark in the admin, the logo on the site, the footer and browser titles."
    >
      <form onSubmit={save} className={cn(DS_FIELDS_CLASS, "items-end")}>
        <DsField
          label="Site name"
          description={name.trim() ? `Its initial, ${siteInitial(name)}, is the mark in the admin.` : undefined}
        >
          <DsInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={SITE_NAME_MAX}
            disabled={saved === null}
            placeholder="Your name or your brand"
          />
        </DsField>
        <DsButton type="submit" variant="primary" disabled={!dirty || saving} loading={saving}>
          Save
        </DsButton>
      </form>
    </SettingsSection>
  );
}
