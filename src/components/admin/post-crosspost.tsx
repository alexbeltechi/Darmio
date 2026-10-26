"use client";

import { useEffect, useState } from "react";
import { DS_COLUMNS_CLASS, DsButton, DsDialog, DsDialogActions, DsDialogCancel, DsField, DsInput, DsSelect, DsSwitch, dsToast } from "@beltechi/parabola";
import { LinkedInIcon, XIcon } from "@/components/site/social-icons";
import {
  DEFAULT_SOURCE_LABELS,
  PLATFORM_META,
  PLATFORMS,
  type ConnectionStatus,
  type Crosspost,
  type Platform,
  type SourceLabel,
  type Syndication,
} from "@/lib/integrations/types";
import type { Entry } from "@/lib/cms/types";

export const PLATFORM_ICONS: Record<Platform, typeof XIcon> = { x: XIcon, linkedin: LinkedInIcon };

/**
 * Connection statuses and source label presets for the post editor. Statuses
 * refetch when the tab regains focus, so connecting in Settings (opened in
 * another tab) shows up here on return.
 */
export function useIntegrations() {
  const [connections, setConnections] = useState<ConnectionStatus[] | null>(null);
  const [sourceLabels, setSourceLabels] = useState<SourceLabel[]>(DEFAULT_SOURCE_LABELS);

  useEffect(() => {
    const refreshConnections = () =>
      fetch("/api/admin/integrations")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => json && setConnections(json.data))
        .catch((error) => console.error("Failed to load integrations:", error));

    refreshConnections();
    fetch("/api/admin/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data?.sourceLabels && setSourceLabels(json.data.sourceLabels))
      .catch((error) => console.error("Failed to load source labels:", error));

    window.addEventListener("focus", refreshConnections);
    return () => window.removeEventListener("focus", refreshConnections);
  }, []);

  return { connections, sourceLabels };
}

/**
 * Post a published post to its toggled-on platforms, toasting each result.
 * Returns the updated post (its syndication and maybe a filled-in source line).
 */
export async function runSyndication(slug: string): Promise<Entry | null> {
  const res = await fetch("/api/admin/integrations/syndicate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    dsToast("Cross-posting failed", { description: json.error || `Error ${res.status}` });
    return null;
  }

  for (const platform of PLATFORMS) {
    const result = (json.results as Syndication)?.[platform];
    if (!result) continue;
    const name = PLATFORM_META[platform].name;
    if (result.status === "posted") {
      dsToast(`Posted to ${name}`, {
        action: result.url ? { label: "View", onClick: () => window.open(result.url, "_blank", "noopener") } : undefined,
      });
    } else {
      dsToast(`Didn't post to ${name}`, { description: result.error });
    }
  }
  return json.data as Entry;
}

const NONE = "__none";

/** The post's "Source: X" line: a preset (or the post's own custom label) plus a link. */
export function SourceFields({
  label,
  url,
  presets,
  onLabelChange,
  onUrlChange,
}: {
  label: string;
  url: string;
  presets: SourceLabel[];
  onLabelChange: (label: string) => void;
  onUrlChange: (url: string) => void;
}) {
  const options = [
    { value: NONE, label: "None" },
    ...presets.map((p) => ({ value: p.name, label: p.name })),
    // A label that isn't a preset (renamed or removed since) stays choosable.
    ...(label && !presets.some((p) => p.name === label) ? [{ value: label, label }] : []),
  ];

  return (
    <>
      <DsField label="Original post" description="Where this first appeared, if anywhere. The post ends with a link there. Labels are in Settings › Integrations.">
        <DsSelect
          options={options}
          value={label || NONE}
          onValueChange={(value) => onLabelChange(value === NONE ? "" : value)}
        />
      </DsField>
      {label && (
        <DsField label="Link to the original">
          <DsInput
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://"
          />
        </DsField>
      )}
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * "Post on X" / "Post on LinkedIn", always shown. Turning one on while its
 * account isn't connected (or the connection expired) opens a dialog that
 * sends you to that section of Settings, and turns the toggle on once you
 * come back connected. A platform the post already went to stays on, locked,
 * with a link to it.
 */
export function CrosspostFields({
  value,
  syndication,
  connections,
  isPublished,
  retrying,
  onChange,
  onRetry,
}: {
  value: Crosspost;
  syndication: Syndication;
  connections: ConnectionStatus[] | null;
  isPublished: boolean;
  retrying: boolean;
  onChange: (value: Crosspost) => void;
  onRetry: () => void;
}) {
  const [blocked, setBlocked] = useState<Platform | null>(null);
  // Turned on from the dialog: switch it on once its connection shows up.
  const [awaiting, setAwaiting] = useState<Platform | null>(null);

  const statusOf = (p: Platform) => connections?.find((c) => c.platform === p);

  useEffect(() => {
    if (!awaiting || statusOf(awaiting)?.state !== "connected") return;
    onChange({ ...value, [awaiting]: true });
    dsToast(`${PLATFORM_META[awaiting].name} connected`);
    setAwaiting(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the connection appearing, not to every edit of value
  }, [connections, awaiting]);

  const toggle = (platform: Platform, on: boolean) => {
    if (on && statusOf(platform)?.state !== "connected") {
      setBlocked(platform);
      return;
    }
    onChange({ ...value, [platform]: on });
  };

  const blockedStatus = blocked ? statusOf(blocked) : undefined;
  const blockedName = blocked ? PLATFORM_META[blocked].name : "";

  return (
    <DsField label="Share" className="w-full">
      <div className={DS_COLUMNS_CLASS}>
        {PLATFORMS.map((platform) => {
          const Icon = PLATFORM_ICONS[platform];
          const name = PLATFORM_META[platform].name;
          const status = statusOf(platform);
          const record = syndication[platform];
          const posted = record?.status === "posted";
          const on = posted || !!value[platform];
          const connected = status?.state === "connected";
          const id = `crosspost-${platform}`;

          let hint: React.ReactNode;
          if (posted) {
            hint = (
              <>
                Posted {formatDate(record.at)}
                {record.url && (
                  <>
                    {" · "}
                    <a href={record.url} target="_blank" rel="noopener noreferrer" className="text-ds-fg underline underline-offset-2 hover:opacity-70">
                      View on {name}
                    </a>
                  </>
                )}
              </>
            );
          } else if (on && record?.status === "failed") {
            hint = (
              <>
                Didn&apos;t post: {record.error}
                {isPublished && connected && (
                  <>
                    {" · "}
                    <button type="button" onClick={onRetry} disabled={retrying} className="text-ds-fg underline underline-offset-2 hover:opacity-70 disabled:opacity-40">
                      {retrying ? "Retrying…" : "Retry"}
                    </button>
                  </>
                )}
              </>
            );
          } else if (status?.state === "expired") {
            hint = "Connection expired. Reconnect in Settings";
          } else if (on) {
            hint = isPublished ? `Posts to ${name} when you save` : `Posts to ${name} when you publish`;
          } else if (connected) {
            hint = `Connected as ${status.account?.handle || status.account?.name}`;
          } else {
            hint = connections ? "Not connected" : " ";
          }

          return (
            <div key={platform} className="flex items-center gap-3">
              <Icon className="size-4 shrink-0 text-ds-fg" />
              <div className="min-w-0 flex-1">
                <label htmlFor={id} className="block text-p text-ds-fg">
                  Post on {name}
                </label>
                <p className="text-small text-ds-fg-muted">{hint}</p>
              </div>
              <DsSwitch
                id={id}
                checked={on}
                disabled={posted}
                onCheckedChange={(checked) => toggle(platform, checked)}
              />
            </div>
          );
        })}
      </div>

      <DsDialog
        open={!!blocked}
        onOpenChange={(open) => !open && setBlocked(null)}
        title={blockedStatus?.state === "expired" ? `${blockedName} connection expired` : `${blockedName} isn't connected`}
        description={
          blockedStatus?.state === "expired"
            ? `Reconnect your ${blockedName} account in Settings. It opens in a new tab, so this post stays as it is; the toggle turns on when you come back.`
            : `Connect your ${blockedName} account in Settings. It opens in a new tab, so this post stays as it is; the toggle turns on when you come back.`
        }
      >
        <DsDialogActions>
          <DsButton
            variant="primary"
            onClick={() => {
              window.open(`/admin/settings#${blocked}`, "_blank");
              setAwaiting(blocked);
              setBlocked(null);
            }}
          >
            {blockedStatus?.state === "expired" ? "Reconnect in Settings" : "Connect in Settings"}
          </DsButton>
          <DsDialogCancel asChild>
            <DsButton>Cancel</DsButton>
          </DsDialogCancel>
        </DsDialogActions>
      </DsDialog>
    </DsField>
  );
}
