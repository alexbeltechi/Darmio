"use client";

import { useEffect, useState } from "react";
import { DsButton, DsField, DsInput, dsToast } from "@beltechi/parabola";
import { SITE_NAME_MAX, siteInitial, type HomeHero } from "@/lib/cms/site";
import { announceSiteSettingsChanged } from "@/components/admin/use-site-settings";
import { useCurrentProject } from "@/components/admin/use-current-project";
import { SettingsSection } from "./settings-section";

type Form = { siteName: string; title: string; ctaLabel: string; ctaHref: string };

const toForm = (siteName: string, hero: HomeHero | null): Form => ({
  siteName,
  title: hero?.title ?? "",
  ctaLabel: hero?.ctaLabel ?? "",
  ctaHref: hero?.ctaHref ?? "",
});

/**
 * The project: its name (the admin's tile, the project menu, the site's logo,
 * the footer, browser titles), where its site is live, and the homepage's
 * headline over the feed, with an optional button.
 */
export function SiteSettings() {
  const { current } = useCurrentProject();
  const [address, setAddress] = useState("");
  useEffect(() => setAddress(window.location.host), []);
  const [saved, setSaved] = useState<Form | null>(null);
  const [form, setForm] = useState<Form>(toForm("", null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((json) => {
        const current = toForm(json.data?.siteName ?? "", json.data?.homeHero ?? null);
        setSaved(current);
        setForm(current);
      })
      .catch(() => setSaved(toForm("", null)));
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
        body: JSON.stringify({
          siteName: form.siteName,
          homeHero: { title: form.title, ctaLabel: form.ctaLabel, ctaHref: form.ctaHref },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const next = toForm(json.data.siteName, json.data.homeHero);
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
        current?.onSite && address ? (
          <>
            Live at{" "}
            <a href="/" target="_blank" rel="noopener noreferrer" className="text-ds-fg underline underline-offset-4">
              {address}
            </a>
          </>
        ) : (
          "Its name, and what the homepage says above your posts."
        )
      }
    >
      <form onSubmit={save} className="flex flex-col gap-5">
        <DsField
          label="Name"
          description={form.siteName.trim() ? `The site's name. Its initial, ${siteInitial(form.siteName)}, is the project's tile.` : undefined}
        >
          <DsInput
            value={form.siteName}
            onChange={(e) => set({ siteName: e.target.value })}
            maxLength={SITE_NAME_MAX}
            disabled={saved === null}
            placeholder="Your name or your brand"
          />
        </DsField>
        <DsField label="Home headline" description="The big line above your posts. Empty shows the posts alone.">
          <DsInput
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            maxLength={200}
            disabled={saved === null}
            placeholder="Optional"
          />
        </DsField>
        {form.title.trim() && (
          <div className="grid gap-5 sm:grid-cols-2">
            <DsField label="Button" description="Optional, with a link.">
              <DsInput value={form.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} maxLength={40} placeholder="See my work" />
            </DsField>
            <DsField label="Button link">
              <DsInput value={form.ctaHref} onChange={(e) => set({ ctaHref: e.target.value })} placeholder="/work" />
            </DsField>
          </div>
        )}
        <DsButton type="submit" variant="primary" disabled={!dirty || saving} loading={saving} className="self-start">
          Save
        </DsButton>
      </form>
    </SettingsSection>
  );
}
