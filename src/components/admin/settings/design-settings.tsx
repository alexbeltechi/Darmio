"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DS_DEFAULT_LIBRARY,
  DS_DEFAULT_THEME_ID,
  DS_THEME_FILE_SUFFIX,
  DsButton,
  DsField,
  DsInfoCard,
  DsSelect,
  dsThemeEntryId,
  dsThemeFileName,
  dsThemeFileParse,
  dsThemeFileText,
  dsToast,
  parseDsThemeLibrary,
  useDsConfirm,
  type DsThemeLibrary,
} from "@beltechi/parabola";
import { SettingsSection } from "./settings-section";

/**
 * Which of the project's Parabola themes its site wears (the admin always
 * wears Parabola's own, so a theme can't make it hard to use): Parabola's own
 * or one added, from /parabola or from a `*.theme.json` file (docs/themes.md),
 * which can be added, switched to, saved again and removed here. A change is saved
 * right away and shows on the site.
 */
export function DesignSettings() {
  const router = useRouter();
  const [confirm, confirmDialog] = useDsConfirm();
  const [library, setLibrary] = useState<DsThemeLibrary | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((json) => setLibrary(parseDsThemeLibrary(json.data?.themes ?? DS_DEFAULT_LIBRARY)))
      .catch(() => setLibrary(DS_DEFAULT_LIBRARY));
  }, []);

  async function save(next: DsThemeLibrary, body: Record<string, unknown>, failure: string) {
    if (!library) return false;
    const before = library;
    setLibrary(next);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.refresh();
      return true;
    } catch (error) {
      setLibrary(before);
      dsToast.error(failure, { description: error instanceof Error ? error.message : undefined });
      return false;
    } finally {
      setSaving(false);
    }
  }

  const choose = (active: string) => save({ ...library!, active }, { activeTheme: active }, "Couldn't change the theme");

  async function importFile(file: File) {
    if (!library) return;
    const result = dsThemeFileParse(await file.text());
    if (!result.ok) {
      dsToast.error("Couldn't read the theme file", { description: result.errors.slice(0, 5).join("\n") });
      return;
    }
    const id = dsThemeEntryId(library, result.name);
    const themes = [...library.themes, { id, name: result.name, theme: result.theme }];
    if (await save({ ...library, themes, active: id }, { themes: { themes, active: id }, activeTheme: id }, "Couldn't add the theme")) {
      dsToast.success(`${result.name} is on your site`);
    }
  }

  async function remove(id: string) {
    if (!library) return;
    const entry = library.themes.find((t) => t.id === id);
    if (!entry || id === DS_DEFAULT_THEME_ID) return;
    const ok = await confirm({
      title: `Remove ${entry.name}?`,
      description:
        library.active === id ? "Your site goes back to Parabola's own look. The file you added is not touched." : "Your site keeps its look.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    const themes = library.themes.filter((t) => t.id !== id);
    const active = library.active === id ? DS_DEFAULT_THEME_ID : library.active;
    const body: Record<string, unknown> = { themes: { themes, active } };
    if (library.active === id) body.activeTheme = DS_DEFAULT_THEME_ID;
    await save({ themes, active }, body, "Couldn't remove the theme");
  }

  function download(id: string) {
    const entry = library?.themes.find((t) => t.id === id);
    if (!entry) return;
    const url = URL.createObjectURL(new Blob([dsThemeFileText(entry.theme, entry.name)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = dsThemeFileName(entry.name);
    link.click();
    URL.revokeObjectURL(url);
  }

  const shown = library ?? DS_DEFAULT_LIBRARY;
  const added = shown.themes.filter((t) => t.id !== DS_DEFAULT_THEME_ID);

  return (
    <SettingsSection
      id="design"
      ai={[{ prompt: "Change the look of <site>: set its Parabola theme (colours, fonts, corners) from what I describe, and show me before you publish it." }]}
      title="Design"
      description={
        <>
          The theme your site wears. Make themes on{" "}
          <a href="/parabola" target="_blank" rel="noopener noreferrer" className="text-ds-fg underline underline-offset-4">
            Parabola
          </a>
          , or add a <code>{DS_THEME_FILE_SUFFIX}</code> file.
        </>
      }
    >
      <DsField label="Theme">
        <DsSelect
          key={shown.themes.length}
          options={shown.themes.map((t) => ({ value: t.id, label: t.name }))}
          value={shown.active}
          onValueChange={choose}
          disabled={library === null || saving}
        />
      </DsField>
      <div className="flex flex-wrap gap-ds-8">
        <input
          ref={fileInput}
          type="file"
          accept={`${DS_THEME_FILE_SUFFIX},application/json`}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void importFile(file);
          }}
        />
        <DsButton onClick={() => fileInput.current?.click()} disabled={library === null || saving}>
          Add a theme file
        </DsButton>
        <DsButton variant="text" onClick={() => download(shown.active)} disabled={library === null}>
          Save this theme as a file
        </DsButton>
        {shown.active !== DS_DEFAULT_THEME_ID && (
          <DsButton variant="text" destructive onClick={() => remove(shown.active)} disabled={saving}>
            Remove this theme
          </DsButton>
        )}
      </div>
      {added.length === 0 && (
        <DsInfoCard title="Made for agents">Ask your agent for a theme, or write one: docs/themes.md explains the file.</DsInfoCard>
      )}
      {confirmDialog}
    </SettingsSection>
  );
}
