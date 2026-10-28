"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DS_DEFAULT_THEME, DsFontPairing, dsApplyTheme, dsToast, type DsThemeConfig } from "@beltechi/parabola";
import { SettingsSection } from "./settings-section";

/**
 * The project's Parabola theme (decisions, 2026-10-28): here its two font
 * families, primary and display; the type scale and added fonts are on
 * /parabola. A pick shows at once across the admin
 * and is saved right away; the site and /parabola take it on their next
 * load. More of the theme (colours, corners) joins here as Parabola grows.
 */
export function DesignSettings() {
  const router = useRouter();
  const [theme, setTheme] = useState<DsThemeConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((json) => setTheme(json.data?.theme ?? DS_DEFAULT_THEME))
      .catch(() => setTheme(DS_DEFAULT_THEME));
  }, []);

  async function change(next: DsThemeConfig) {
    const before = theme;
    setTheme(next);
    dsApplyTheme(next);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.refresh();
    } catch (error) {
      if (before) {
        setTheme(before);
        dsApplyTheme(before);
      }
      dsToast.error("Couldn't save the fonts", { description: error instanceof Error ? error.message : undefined });
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
          The two font families your site and this admin are set in. Which styles use which, their
          sizes and fonts to add are on{" "}
          <a href="/parabola/typography/type-scale" target="_blank" rel="noopener noreferrer" className="text-ds-fg underline underline-offset-4">
            Parabola
          </a>
          .
        </>
      }
    >
      <DsFontPairing theme={theme ?? DS_DEFAULT_THEME} onChange={change} disabled={theme === null || saving} />
    </SettingsSection>
  );
}
