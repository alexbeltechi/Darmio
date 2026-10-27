"use client";

import { useEffect, useState } from "react";
import { DsField, DsLink, DsSelect, dsToast } from "@beltechi/parabola";
import { ACCOUNT_PATH } from "@/components/admin/home/home-routes";
import { SettingsSection } from "./settings-section";

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
 * Settings › Library: how new uploads are made (AVIF quality), and this
 * project's share of the image storage every project shares (the whole store
 * is under Home › Settings, decisions 2026-10-27). Quality only applies to new uploads:
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

      {usage && (
        <p className="text-p text-ds-fg-muted">
          This project&apos;s {usage.items} media items take {formatMB(usage.bytes)} of the image storage every project
          shares.{" "}
          <DsLink href={`${ACCOUNT_PATH}#storage`} className="text-ds-fg underline underline-offset-4">
            See all of it in Settings
          </DsLink>
          .
          {usage.legacyItems > 0 &&
            ` ${usage.legacyItems} images are from before AVIF and are resized on request by Vercel until they're uploaded again.`}
        </p>
      )}
    </SettingsSection>
  );
}
