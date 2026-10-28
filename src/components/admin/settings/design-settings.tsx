"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DS_DEFAULT_LIBRARY,
  DsField,
  DsSelect,
  dsApplyTheme,
  dsToast,
  parseDsThemeLibrary,
  type DsThemeLibrary,
} from "@beltechi/parabola";
import { SettingsSection } from "./settings-section";

/**
 * Which of the project's Parabola themes its site and this admin wear
 * (decisions, 2026-10-28): Default or one added on /parabola, where themes
 * are made and published. A pick shows at once and is saved right away.
 */
export function DesignSettings() {
  const router = useRouter();
  const [library, setLibrary] = useState<DsThemeLibrary | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((json) => setLibrary(parseDsThemeLibrary(json.data?.themes ?? DS_DEFAULT_LIBRARY)))
      .catch(() => setLibrary(DS_DEFAULT_LIBRARY));
  }, []);

  async function choose(active: string) {
    if (!library) return;
    const before = library;
    const next = { ...library, active };
    setLibrary(next);
    dsApplyTheme(next.themes.find((t) => t.id === active)!.theme);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeTheme: active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.refresh();
    } catch (error) {
      setLibrary(before);
      dsApplyTheme(before.themes.find((t) => t.id === before.active)!.theme);
      dsToast.error("Couldn't change the theme", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      id="design"
      title="Design"
      description={
        <>
          The theme your site and this admin wear. Make and change themes on{" "}
          <a href="/parabola" target="_blank" rel="noopener noreferrer" className="text-ds-fg underline underline-offset-4">
            Parabola
          </a>
          .
        </>
      }
    >
      <DsField label="Theme">
        <DsSelect
          key={library ? library.themes.length : 0}
          options={(library ?? DS_DEFAULT_LIBRARY).themes.map((t) => ({ value: t.id, label: t.name }))}
          value={(library ?? DS_DEFAULT_LIBRARY).active}
          onValueChange={choose}
          disabled={library === null || saving}
        />
      </DsField>
    </SettingsSection>
  );
}
