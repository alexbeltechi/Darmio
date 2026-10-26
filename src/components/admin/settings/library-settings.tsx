"use client";

import { useEffect, useState } from "react";
import { DsField, DsSelect, dsToast } from "@beltechi/parabola";
import { SettingsSection } from "./settings-section";

// Vercel Blob's free (Hobby) plan. Past it, Blob stops serving until the month resets.
const FREE_STORAGE_BYTES = 1024 ** 3;

const QUALITY_OPTIONS = [50, 55, 60, 65, 70, 75, 80, 85, 90].map((q) => ({
  value: String(q),
  label: q === 70 ? "70 (default)" : String(q),
}));

interface Usage {
  bytes: number;
  items: number;
  legacyItems: number;
}

function formatMB(bytes: number): string {
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

/**
 * Settings › Library: how new uploads are made (AVIF quality) and how much of
 * the free storage the library takes. Quality only applies to new uploads:
 * going down later is possible from the stored copies, going up needs the
 * originals.
 */
export function LibrarySettings() {
  const [quality, setQuality] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setQuality(String(data.data?.imageQuality ?? 70)))
      .catch(() => setQuality("70"));
    fetch("/api/admin/media/usage")
      .then((res) => res.json())
      .then((data) => data.data && setUsage(data.data))
      .catch(() => {});
  }, []);

  async function save(next: string) {
    const previous = quality;
    setQuality(next);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageQuality: Number(next) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      dsToast.success(`New uploads will be saved at quality ${next}`);
    } catch (error) {
      setQuality(previous);
      dsToast.error(error instanceof Error ? error.message : "Failed to save image quality");
    }
  }

  const share = usage ? Math.min(1, usage.bytes / FREE_STORAGE_BYTES) : 0;

  return (
    <SettingsSection
      id="library"
      title="Library"
      description="Every upload is saved once as AVIF at a few widths (up to 2560px) plus a JPEG for older browsers. Pages pick the width each screen needs."
    >
      <DsField
        label="Quality for new uploads"
        description="Higher keeps more detail and film grain, and takes more storage. Uploads already made keep their quality."
      >
        <DsSelect
          options={QUALITY_OPTIONS}
          value={quality ?? undefined}
          onValueChange={save}
          disabled={quality === null}
        />
      </DsField>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-p text-ds-fg">Storage</span>
          <span className="text-p text-ds-fg-muted">
            {usage ? `${formatMB(usage.bytes)} of 1 GB free` : "…"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ds-bg" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label="Storage used">
          <div className="h-full rounded-full bg-ds-fg" style={{ width: `${share * 100}%` }} />
        </div>
        {usage && (
          <p className="text-small text-ds-fg-muted">
            {usage.items} media items, counted by the CMS.
            {usage.legacyItems > 0 &&
              ` ${usage.legacyItems} images are from before AVIF and are resized on request by Vercel until they're uploaded again.`}
          </p>
        )}
      </div>
    </SettingsSection>
  );
}
