"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { DsField, DsLink, DsProgress, DsSelect, dsSegmentColor, dsToast } from "@beltechi/parabola";
import { files, gbOrMb, mb, percentUsed } from "./install-settings";
import type { InstallUsage } from "@/lib/db/install";
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


/**
 * Settings › Library: first whether the database answers (a tick, the
 * service, and how much of its free plan the install uses), then how new
 * uploads are made (AVIF quality), and this
 * project's share of the image storage every project shares (the whole store
 * is under Home › Settings). Quality only applies to new uploads:
 * going down later is possible from the stored copies, going up needs the
 * originals.
 */
export function LibrarySettings() {
  const [quality, setQuality] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  // This project's share of the store every project uses, in its colour from the project list.
  const [share, setShare] = useState<{ mine: number; others: number; totalBytes: number; freeBytes: number; index: number } | null>(null);
  // The database: working (it answered, with its size), or not reachable.
  const [database, setDatabase] = useState<InstallUsage["database"] | "unreachable" | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setQuality(String(data.data?.imageQuality ?? 70)))
      .catch(() => setQuality("70"));
    fetch("/api/admin/media/usage")
      .then((res) => res.json())
      .then((data) => data.data && setUsage(data.data))
      .catch(() => {});
    fetch("/api/admin/install")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const install = json?.data as InstallUsage | undefined;
        setDatabase(install?.database ?? "unreachable");
        if (!install) return;
        const index = Math.max(0, install.storage.projects.findIndex((p) => p.slug === install.current));
        const mine = install.storage.projects[index]?.bytes ?? 0;
        setShare({ mine, others: install.storage.totalBytes - mine, totalBytes: install.storage.totalBytes, freeBytes: install.storage.freeBytes, index });
      })
      .catch(() => setDatabase("unreachable"));
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
      ai={[{ prompt: "Check the database and image storage of <site>: are they working, how much of the free plans they use, and what to do before they fill up." }]}
      title="Library"
      description="Your database, image storage, and how uploads are saved"
      note="Every upload is saved once as AVIF, plus a JPEG for older browsers. Pages pick the width each screen needs."
    >
      {database === "unreachable" ? (
        <p className="flex items-center gap-ds-8 text-p text-ds-fg">
          <X aria-hidden className="size-4 shrink-0 text-ds-error" />
          Can&apos;t reach the database right now. Try again in a minute, or ask your AI below.
        </p>
      ) : (
        database && (
          <p className="flex flex-wrap items-center gap-x-ds-8 text-p">
            <Check aria-hidden className="size-4 shrink-0 text-ds-fg" />
            <span className="text-ds-fg">Database working</span>
            <span className="text-ds-fg-muted">
              {database.atlas ? "MongoDB Atlas" : "MongoDB"} · {mb(database.totalBytes)} of {gbOrMb(database.freeBytes)}
              {database.atlas ? " on the free plan" : ""}
            </span>
          </p>
        )
      )}

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

      {usage && share && (
        <DsProgress
          max={share.freeBytes}
          title={`Storage, ${percentUsed(share.totalBytes, share.freeBytes)}`}
          meta={`${mb(share.totalBytes)} of ${gbOrMb(share.freeBytes)}`}
          segments={
            share.totalBytes === 0
              ? []
              : [
                  { value: share.mine, label: "This project", meta: mb(share.mine), color: dsSegmentColor(share.index) },
                  ...(share.others > 0
                    ? [{ value: share.others, label: "Your other projects", meta: mb(share.others), color: "var(--ds-fg-subtle)" }]
                    : []),
                ]
          }
          description={
            <>
              {usage.items === 0 ? "Nothing uploaded to this project yet." : `${files(usage.items)} in this project.`} Storage is shared by every project:{" "}
              <DsLink href={`${ACCOUNT_PATH}#storage`} className="text-ds-fg underline underline-offset-4">
                see all of it in Settings
              </DsLink>
              .
              {usage.legacyItems > 0 &&
                ` ${usage.legacyItems} images are from before AVIF and are resized on request by Vercel until they're uploaded again.`}
            </>
          }
        />
      )}
    </SettingsSection>
  );
}
