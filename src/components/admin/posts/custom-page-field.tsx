"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { DsButton, DsField, DsSwitch, dsToast } from "@beltechi/parabola";
import { AiInstructions } from "@/components/admin/settings/settings-section";
import type { CustomPageSetting } from "@/lib/cms/custom-pages";

/**
 * A post's page, in its details: the standard layout, or a custom page of
 * its own (lib/cms/custom-pages.ts). It reports what's there rather than
 * offering a switch that does nothing: with no custom page it says
 * "Standard layout" and how to ask an AI for one; with one, a switch turns
 * it off and on (the page is kept either way), and two links open the post
 * each way to compare. The switch saves on its own and applies to the live
 * post straight away: it changes how the post is shown, not what it says.
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

  if (!value) {
    return (
      <DsField label="Page" className="w-full">
        <p className="text-p text-ds-fg-muted">Standard layout.</p>
        <AiInstructions
          prompts={[
            {
              label: "For a page of its own, made for this post",
              prompt: `Build a custom page for the post "${slug}" on <site>. Read the agent guide's "Custom pages" first: all the content stays in the post, the page only arranges it. The look I want: `,
            },
          ]}
        />
      </DsField>
    );
  }

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
      dsToast(on ? "Custom page on" : "Standard layout on", { description: on ? undefined : "The custom page is kept." });
    } catch (error) {
      dsToast.error("Couldn't change the page", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  }

  if (known && !known.includes(value.key)) {
    return (
      <DsField label="Page" className="w-full">
        <p className="text-p text-ds-fg-muted">
          Standard layout. This post asks for a custom page called “{value.key}”, and this site’s code doesn’t have it.
        </p>
      </DsField>
    );
  }

  const on = !value.off;
  return (
    <DsField label="Page" className="w-full">
      <label className="flex items-center gap-ds-8 text-p text-ds-fg">
        <DsSwitch checked={on} disabled={saving || known === null} onCheckedChange={setOn} />
        Custom page
      </label>
      <p className="text-p text-ds-fg-muted">
        {on
          ? "This post has a page of its own. Off shows the standard layout; the custom page is kept."
          : "Showing the standard layout. The custom page is kept: turn it on to bring it back."}
      </p>
      <div className="flex flex-wrap gap-ds-8">
        <DsButton size="small" href={`/post/${slug}/preview?page=custom`} target="_blank" iconRight={ArrowUpRight}>
          See custom
        </DsButton>
        <DsButton size="small" href={`/post/${slug}/preview?page=standard`} target="_blank" iconRight={ArrowUpRight}>
          See standard
        </DsButton>
      </div>
    </DsField>
  );
}
