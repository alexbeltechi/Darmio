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
export const gbOrMb = (bytes: number) => (bytes >= 1024 ** 3 ? `${bytes / 1024 ** 3} GB` : `${Math.round(bytes / 1024 ** 2)} MB`);

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
 * What the install runs on, for every project at once (decisions,
 * 2026-10-27): the hosting, the MongoDB database and the image storage, each
 * set up once when Darmio was installed. Projects share all three: the free
 * tiers are the install's, not split per project. Bars measure against the
 * free tiers, since a site can't ask Vercel or Atlas which plan it's on. Each
 * card's short line says what it runs on now; run locally, it says what it's
 * ready for once deployed. The named things link to where they're managed.
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
        title="Hosting"
        description={usage && (usage.hosting.provider === "vercel" ? "Vercel" : "This computer, ready for Vercel")}
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
            "You're running it here to develop. Deployed to Vercel, this shows its address, the repo it deploys from and its region."
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
        title="Database"
        description={usage && (usage.database.atlas ? "MongoDB Atlas" : "MongoDB")}
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
            title="Used"
            meta={`${mb(usage.database.totalBytes)} of ${gbOrMb(usage.database.freeBytes)}`}
            description={`Measured against Atlas's free cluster (M0). ${shared} Anything else in the cluster counts too.`}
          />
        )}
      </SettingsSection>

      <SettingsSection
        id="storage"
        title="Storage"
        description={usage && (usage.storage.provider === "vercel-blob" ? "Vercel Blob" : "This computer, ready for Vercel Blob")}
        note={
          usage &&
          (usage.storage.provider === "vercel-blob" ? (
            <>
              Images and video from every project, in one{" "}
              <SettingsLink href="https://vercel.com/dashboard/stores">Blob store</SettingsLink>.
            </>
          ) : (
            "Images and video go to the public/uploads folder while you develop. Deployed to Vercel with a Blob store, they go there."
          ))
        }
      >
        {usage && (
          <DsProgress
            segments={projectSegments(usage.storage.projects)}
            max={usage.storage.freeBytes}
            label="Storage used"
            title="Used"
            meta={`${mb(usage.storage.totalBytes)} of ${gbOrMb(usage.storage.freeBytes)}`}
            description={
              usage.storage.provider === "vercel-blob"
                ? `${usage.storage.items} media items, counted by Darmio, measured against Vercel Blob's free Hobby plan. ${shared} Past the limit, Blob stops serving files until the month resets.`
                : `${usage.storage.items} media items, counted by Darmio. ${shared}`
            }
          />
        )}
      </SettingsSection>
    </>
  );
}
