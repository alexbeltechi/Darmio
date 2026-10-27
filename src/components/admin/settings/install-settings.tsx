"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { DsButton, DsProgress, type DsProgressSegment } from "@beltechi/parabola";
import type { InstallUsage, ProjectUse } from "@/lib/db/install";
import { SettingsSection } from "./settings-section";

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

function Open({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <DsButton href={href} target="_blank" rel="noopener noreferrer" iconRight={ExternalLink} className="self-start">
      {children}
    </DsButton>
  );
}

/**
 * What the install runs on, for every project at once (decisions,
 * 2026-10-27): the hosting, the MongoDB database and the image storage, each
 * set up once when Darmio was installed. Projects share all three: the free
 * tiers are the install's, not split per project. Bars measure against the
 * free tiers, since a site can't ask Vercel or Atlas which plan it's on; each
 * card links to where the plan is set.
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
      <SettingsSection id="install" title="Hosting and storage" description="Couldn't read what this install runs on. Try again in a moment." >
        <span />
      </SettingsSection>
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
        description={
          usage?.hosting.provider === "vercel"
            ? "Vercel runs this site. One deployment serves every project; the public address shows the first one."
            : "This site runs on this computer, for development."
        }
      >
        {usage && usage.hosting.provider === "vercel" && (
          <>
            <div className="flex flex-col gap-2">
              {usage.hosting.address && <Fact label="Address">{usage.hosting.address}</Fact>}
              {usage.hosting.repo && <Fact label="Code from">{usage.hosting.repo}</Fact>}
              {usage.hosting.region && <Fact label="Region">{usage.hosting.region}</Fact>}
              <Fact label="Plan">See it on Vercel</Fact>
            </div>
            <p className="text-small text-ds-fg-muted">
              A site can&apos;t see its own Vercel plan. The free Hobby plan suits a personal site; traffic and build limits are on Vercel.
            </p>
            <Open href="https://vercel.com/dashboard">Open Vercel</Open>
          </>
        )}
      </SettingsSection>

      <SettingsSection
        id="database"
        title="Database"
        description={
          usage
            ? `${usage.database.atlas ? "MongoDB Atlas" : "MongoDB"}${usage.database.host ? `, ${usage.database.host}` : ""}. Each project is its own database in this one cluster; your account lives with the first.`
            : "Your posts, pages, settings and account."
        }
      >
        {usage && (
          <>
            <DsProgress
              segments={projectSegments(usage.database.projects)}
              max={usage.database.freeBytes}
              label="Database used"
              title="Used"
              meta={`${mb(usage.database.totalBytes)} of ${gbOrMb(usage.database.freeBytes)}`}
              description={`Measured against Atlas's free cluster (M0). ${shared} Anything else in the cluster counts too.`}
            />
            {usage.database.atlas && <Open href="https://cloud.mongodb.com">Open MongoDB Atlas</Open>}
          </>
        )}
      </SettingsSection>

      <SettingsSection
        id="storage"
        title="Image storage"
        description={
          usage?.storage.provider === "vercel-blob"
            ? "Vercel Blob keeps every upload, for every project, in one store."
            : "Uploads are kept in this computer's public/uploads folder."
        }
      >
        {usage && (
          <>
            <DsProgress
              segments={projectSegments(usage.storage.projects)}
              max={usage.storage.freeBytes}
              label="Image storage used"
              title="Used"
              meta={`${mb(usage.storage.totalBytes)} of ${gbOrMb(usage.storage.freeBytes)}`}
              description={
                usage.storage.provider === "vercel-blob"
                  ? `${usage.storage.items} media items, counted by Darmio, measured against Vercel Blob's free Hobby plan. ${shared} Past the limit, Blob stops serving files until the month resets.`
                  : `${usage.storage.items} media items, counted by Darmio. ${shared}`
              }
            />
            {usage.storage.provider === "vercel-blob" && <Open href="https://vercel.com/dashboard/stores">Open Vercel storage</Open>}
          </>
        )}
      </SettingsSection>
    </>
  );
}
