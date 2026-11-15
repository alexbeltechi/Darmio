"use client";

import { useEffect, useState } from "react";
import { DsProgress, type DsProgressSegment } from "@beltechi/parabola";
import type { InstallUsage, ProjectUse } from "@/lib/db/install";
import { SettingsLink, SettingsSection } from "./settings-section";

/** A size in words: KB under a megabyte, MB (one decimal under 10) above. */
export const mb = (bytes: number) =>
  bytes < 1024 ** 2
    ? `${Math.max(bytes > 0 ? 1 : 0, Math.round(bytes / 1024))} KB`
    : `${bytes < 10 * 1024 ** 2 ? (bytes / 1024 ** 2).toFixed(1) : Math.round(bytes / 1024 ** 2)} MB`;
/** How much of a limit is used, e.g. "0.1% used", "40% used": one decimal under 10%, "<0.1%" for a trace. */
export const percentUsed = (bytes: number, max: number) => {
  const pct = max > 0 ? (bytes / max) * 100 : 0;
  const shown = pct === 0 ? "0" : pct < 0.1 ? "<0.1" : pct < 10 ? pct.toFixed(1).replace(/\.0$/, "") : String(Math.round(pct));
  return `${shown}% used`;
};
export const gbOrMb = (bytes: number) => (bytes >= 1024 ** 3 ? `${bytes / 1024 ** 3} GB` : `${Math.round(bytes / 1024 ** 2)} MB`);

/** "1 file", "6 files". */
export const files = (count: number) => `${count} ${count === 1 ? "file" : "files"}`;

/** One segment per project, in its place in the project list (so its colour matches everywhere). */
export const projectSegments = (projects: ProjectUse[]): DsProgressSegment[] =>
  projects.map((p) => ({ value: p.bytes, label: p.name, meta: mb(p.bytes) }));

/** A label and its value on one line. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-p text-ds-fg-muted">{label}</span>
      <span className="min-w-0 truncate text-p text-ds-fg">{children}</span>
    </div>
  );
}

/**
 * What the install runs on, for every project at once: the
 * hosting, the MongoDB database and the image storage, each
 * set up once when Darmio was installed. Projects share all three: the free
 * tiers are the install's, not split per project. Bars measure against the
 * free tiers, since a site can't ask Vercel or Atlas which plan it's on. Each
 * card's short line names the service, linking to it; before the site is
 * deployed, the note says so in plain words and what shows here once it is.
 */
export function InstallSettings() {
  const [usage, setUsage] = useState<InstallUsage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/admin/install")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setUsage(json.data))
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <SettingsSection id="install" title="Hosting and storage" description="Couldn't read what this install runs on. Try again in a moment." />
    );
  }

  const shared = usage
    ? `Shared by your ${usage.projectCount === 1 ? "1 project" : `${usage.projectCount} projects`} (up to ${usage.projectsMax} per install).`
    : "";

  return (
    <>
      <SettingsSection
        id="hosting"
        ai={[{ prompt: "Check the hosting of <site>: that it deploys from my GitHub copy, and connect my own domain when I give you one." }]}
        title="Hosting"
        description={<SettingsLink href="https://vercel.com/dashboard">Vercel</SettingsLink>}
        note={
          usage &&
          (usage.hosting.provider === "vercel" ? (
            <>
              {usage.hosting.address && (
                <>
                  Your site is at <SettingsLink href={`https://${usage.hosting.address}`}>{usage.hosting.address}</SettingsLink>.{" "}
                </>
              )}
              One deployment serves every project; the public address shows the first one.
            </>
          ) : (
            "Not deployed yet. Once you deploy to Vercel, your site's address and details show here."
          ))
        }
      >
        {usage && usage.hosting.provider === "vercel" && (
          <>
            <div className="flex flex-col gap-2">
              {usage.hosting.repo && <Fact label="Code from">{usage.hosting.repo}</Fact>}
              {usage.hosting.region && <Fact label="Region">{usage.hosting.region}</Fact>}
              <Fact label="Plan">
                <SettingsLink href="https://vercel.com/dashboard">See it on Vercel</SettingsLink>
              </Fact>
            </div>
            <p className="text-small text-ds-fg-muted">
              A site can&apos;t see its own Vercel plan. The free Hobby plan suits a personal site; traffic and build limits are on Vercel.
            </p>
          </>
        )}
      </SettingsSection>

      <SettingsSection
        id="database"
        ai={[{ prompt: "Check the database of <site>: is it working, how much of the free plan it uses, and what to do before it fills up. If I ask, move it to another MongoDB database without losing anything." }]}
        title="Database"
        description={
          usage &&
          (usage.database.atlas ? <SettingsLink href="https://cloud.mongodb.com">MongoDB Atlas</SettingsLink> : "MongoDB")
        }
        note={
          usage ? (
            <>
              {usage.database.host && (
                <>
                  Your cluster is{" "}
                  {usage.database.atlas ? (
                    <SettingsLink href="https://cloud.mongodb.com">{usage.database.host}</SettingsLink>
                  ) : (
                    usage.database.host
                  )}
                  .{" "}
                </>
              )}
              Each project is its own database in it; your account lives with the first.
            </>
          ) : (
            "Your posts, pages, settings and account."
          )
        }
      >
        {usage && (
          <DsProgress
            segments={projectSegments(usage.database.projects)}
            max={usage.database.freeBytes}
            label="Database used"
            title={percentUsed(usage.database.totalBytes, usage.database.freeBytes)}
            meta={`${mb(usage.database.totalBytes)} of ${gbOrMb(usage.database.freeBytes)}`}
            description={`Measured against Atlas's free cluster (M0). ${shared} Anything else in the cluster counts too.`}
          />
        )}
      </SettingsSection>

      <SettingsSection
        id="storage"
        ai={[{ prompt: "Check the image storage of <site>: how much of the free plan it uses, and what to do before it fills up." }]}
        title="Storage"
        description={<SettingsLink href="https://vercel.com/dashboard/stores">Vercel Blob</SettingsLink>}
        note={
          usage &&
          (usage.storage.provider === "vercel-blob" ? (
            "Images and video from every project, in one store."
          ) : (
            "Not deployed yet, so uploads stay on this computer for now. Once you deploy to Vercel, they're kept in Vercel Blob."
          ))
        }
      >
        {usage && (
          <DsProgress
            segments={usage.storage.totalBytes > 0 ? projectSegments(usage.storage.projects) : []}
            max={usage.storage.freeBytes}
            label="Storage used"
            title={percentUsed(usage.storage.totalBytes, usage.storage.freeBytes)}
            meta={`${mb(usage.storage.totalBytes)} of ${gbOrMb(usage.storage.freeBytes)}`}
            description={
              usage.storage.items === 0
                ? `Nothing uploaded yet. ${shared}`
                : usage.storage.provider === "vercel-blob"
                  ? `${files(usage.storage.items)}. ${shared} Measured against Vercel Blob's free Hobby plan; past the limit, Blob stops serving files until the month resets.`
                  : `${files(usage.storage.items)}. ${shared}`
            }
          />
        )}
      </SettingsSection>
    </>
  );
}
