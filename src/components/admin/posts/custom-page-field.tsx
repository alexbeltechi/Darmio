"use client";

import { useEffect, useState } from "react";
import { DsSwitch, dsToast } from "@beltechi/parabola";
import type { CustomPageSetting } from "@/lib/cms/custom-pages";

/**
 * "Custom styling" in a post's details: whether the post is drawn by a
 * custom page of its own (lib/cms/custom-pages.ts). The toggle sits in the
 * title and only appears when there is a custom page to turn on or off; off
 * shows the standard layout and keeps the custom page. It saves on its own,
 * straight to the live post: it changes how the post looks, not what it says.
 */
export function CustomPageField({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: CustomPageSetting | null;
  onChange: (next: CustomPageSetting) => void;
}) {
  // The custom pages this site's code has; null until known.
  const [known, setKnown] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!value) return;
    fetch("/api/admin/custom-pages")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setKnown((json?.data as string[]) || []))
      .catch(() => setKnown([]));
  }, [value]);

  async function setOn(on: boolean) {
    if (!value) return;
    const next: CustomPageSetting = on ? { key: value.key } : { key: value.key, off: true };
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/collections/posts/entries/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { customPage: next } }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onChange(next);
    } catch (error) {
      dsToast.error("Couldn't change it", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  // A custom page the site's code doesn't have can't be shown, so there's nothing to switch.
  const exists = Boolean(value) && known !== null && known.includes(value!.key);
  const on = exists && !value!.off;

  return (
    // Laid out as a field: its label in the label's place, with the toggle beside it.
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-ds-8">
        <span id="custom-styling" className="text-p text-ds-fg-muted">
          Custom styling
        </span>
        {exists && <DsSwitch aria-labelledby="custom-styling" checked={on} disabled={saving} onCheckedChange={setOn} />}
      </div>
      <p className="text-p text-ds-fg">
        {on ? "This post has custom styling." : "This post doesn't have custom styling."}
      </p>
    </div>
  );
}
