"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Plus, X } from "lucide-react";
import { SettingsSection } from "./settings-section";
import { KitSection } from "./kit-settings";
import { DsButton, DsConfirmDialog, DsDivider, DsInput, DsPill, DsSelect, DsSwitch, dsToast } from "@beltechi/parabola";
import { PLATFORM_ICONS } from "@/components/admin/post-crosspost";
import { formatRelativeTime } from "@/lib/utils";
import {
  DEFAULT_SOURCE_LINE,
  PLATFORM_META,
  PLATFORMS,
  callbackPath,
  type ConnectionStatus,
  type Platform,
  type SourceLabel,
  type SourceLineSettings,
} from "@/lib/integrations/types";

const STATE_PILL: Record<ConnectionStatus["state"], { label: string; variant: "dark" | "light" | "highlight" }> = {
  connected: { label: "Connected", variant: "dark" },
  expired: { label: "Reconnect needed", variant: "highlight" },
  disconnected: { label: "Not connected", variant: "light" },
  unconfigured: { label: "Not set up", variant: "light" },
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/**
 * Settings → Integrations. One card per platform (anchored `#x`, `#linkedin`,
 * which the post editor links to) and one for Kit, the newsletter list
 * (`#kit`), then the Link back presets.
 */
export function IntegrationsSettings() {
  return (
    <>
      <ConnectionsCard />
      <SourceLineCard />
    </>
  );
}

function ConnectionsCard() {
  const [statuses, setStatuses] = useState<ConnectionStatus[] | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [disconnecting, setDisconnecting] = useState<Platform | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<Platform | null>(null);

  const load = useCallback(async (verify: boolean) => {
    if (verify) setVerifying(true);
    try {
      const res = await fetch(`/api/admin/integrations${verify ? "?verify=1" : ""}`);
      if (res.ok) setStatuses((await res.json()).data);
    } catch (error) {
      console.error("Failed to load integrations:", error);
    } finally {
      if (verify) setVerifying(false);
    }
  }, []);

  // Show what's stored straight away, then check each token with its platform.
  useEffect(() => {
    load(false).then(() => load(true));
  }, [load]);

  // Back from connecting: say how it went, then tidy the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("integration");
    if (!platform) return;
    const name = PLATFORM_META[platform as Platform]?.name ?? platform;
    const error = params.get("error");
    if (error) dsToast(`Couldn't connect ${name}`, { description: error });
    else if (params.get("connected")) dsToast(`${name} connected`);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
  }, []);

  // The editor links straight to a platform's section, which only exists once loaded.
  useEffect(() => {
    if (!statuses || !window.location.hash) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }, [statuses]);

  const disconnect = async (platform: Platform) => {
    setDisconnecting(platform);
    try {
      const res = await fetch(`/api/admin/integrations/${platform}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      dsToast(`${PLATFORM_META[platform].name} disconnected`);
      await load(false);
    } catch {
      dsToast(`Couldn't disconnect ${PLATFORM_META[platform].name}`);
    } finally {
      setDisconnecting(null);
      setConfirmDisconnect(null);
    }
  };

  return (
    <SettingsSection
      id="integrations"
      title="Integrations"
      description="Where posts and sign-ups go"
      note="The platforms posts go to, and the list newsletter sign-ups go to. Each name opens the account it's connected to, so you can check which one it is."
    >
        {PLATFORMS.map((platform, i) => {
          const status = statuses?.find((s) => s.platform === platform);
          return (
            <div key={platform} className="flex flex-col gap-5">
              {i > 0 && <DsDivider />}
              <PlatformSection
                platform={platform}
                status={status}
                verifying={verifying}
                disconnecting={disconnecting === platform}
                onDisconnect={() => setConfirmDisconnect(platform)}
              />
            </div>
          );
        })}
        <DsDivider />
        <KitSection />

      <DsConfirmDialog
        open={!!confirmDisconnect}
        onOpenChange={(open) => !open && setConfirmDisconnect(null)}
        title={`Disconnect ${confirmDisconnect ? PLATFORM_META[confirmDisconnect].name : ""}?`}
        description="Posts already shared stay up. To revoke access fully, also remove the app in that account's settings."
        confirmLabel="Disconnect"
        destructive
        loading={!!disconnecting}
        onConfirm={() => confirmDisconnect && disconnect(confirmDisconnect)}
      />
    </SettingsSection>
  );
}

function PlatformSection({
  platform,
  status,
  verifying,
  disconnecting,
  onDisconnect,
}: {
  platform: Platform;
  status?: ConnectionStatus;
  verifying: boolean;
  disconnecting: boolean;
  onDisconnect: () => void;
}) {
  const meta = PLATFORM_META[platform];
  const Icon = PLATFORM_ICONS[platform];
  const state = status?.state;
  const accountUrl = status?.account?.url;
  const connect = () => {
    window.location.href = `/api/admin/integrations/${platform}/connect`;
  };

  let detail: React.ReactNode = null;
  if (state === "connected" && status) {
    const days = status.expiresAt ? daysUntil(status.expiresAt) : null;
    detail = (
      <>
        <p>
          Signed in as{" "}
          {status.account?.url ? (
            <a href={status.account.url} target="_blank" rel="noopener noreferrer" className="text-ds-fg underline underline-offset-2 hover:opacity-70">
              {status.account.handle || status.account.name}
            </a>
          ) : (
            <span className="text-ds-fg">{status.account?.name}</span>
          )}
        </p>
        <p className={days !== null && days <= 7 ? "text-ds-highlight" : undefined}>
          {days === null
            ? "Renews automatically"
            : `Expires in ${days} ${days === 1 ? "day" : "days"}; reconnect before then to keep posting`}
          {verifying ? " · Checking…" : status.checkedAt ? ` · Checked ${formatRelativeTime(status.checkedAt)}` : ""}
        </p>
      </>
    );
  } else if (state === "expired") {
    detail = (
      <>
        {status?.account && <p>Was signed in as {status.account.handle || status.account.name}</p>}
        <p className="text-ds-highlight">{status?.error || "The connection expired."} Reconnect to keep posting.</p>
      </>
    );
  } else if (state === "unconfigured") {
    detail = <SetupSteps platform={platform} />;
  }

  return (
    <section id={platform} className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex items-center gap-3">
        <Icon className="size-5 shrink-0 text-ds-fg" />
        <h3 className="flex-1 text-h3 text-ds-fg">
          <a
            href={accountUrl || meta.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={accountUrl ? "Open the connected account" : `Open ${meta.name}`}
            className="inline-flex items-center gap-1 rounded-ds-md hover:opacity-70 ds-focus"
          >
            {meta.name}
            <ExternalLink aria-hidden className="size-3 text-ds-fg-muted" />
          </a>
        </h3>
        {state && <DsPill variant={STATE_PILL[state].variant}>{STATE_PILL[state].label}</DsPill>}
      </div>

      {detail && <div className="flex flex-col gap-1 text-p text-ds-fg-muted">{detail}</div>}

      {state && state !== "unconfigured" && (
        <div className="flex flex-wrap gap-2">
          {state === "disconnected" && (
            <DsButton variant="primary" onClick={connect}>
              Connect {meta.name}
            </DsButton>
          )}
          {state === "expired" && (
            <DsButton variant="primary" onClick={connect}>
              Reconnect
            </DsButton>
          )}
          {state === "connected" && <DsButton onClick={connect}>Reconnect</DsButton>}
          {(state === "connected" || state === "expired") && (
            <DsButton onClick={onDisconnect} loading={disconnecting}>
              Disconnect
            </DsButton>
          )}
        </div>
      )}
    </section>
  );
}

/** What to do in the platform's developer portal before Connect works. */
function SetupSteps({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform];
  // Only rendered after the statuses load in the browser, so `window` is there.
  const callbackUrl = `${typeof window === "undefined" ? "" : window.location.origin}${callbackPath(platform)}`;

  return (
    <ol className="flex list-decimal flex-col gap-2 pl-5">
      <li>
        Create an app in the{" "}
        <a href={meta.developerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ds-fg underline underline-offset-2 hover:opacity-70">
          {meta.name} developer portal <ExternalLink className="size-3" />
        </a>
        {platform === "linkedin"
          ? ', and add the "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn" products.'
          : ", with OAuth 2.0 turned on as a Web App with read and write permissions."}
      </li>
      <li>
        <span>Add this as a redirect / callback URL:</span>
        <span className="mt-1 flex items-center gap-1">
          <code className="min-w-0 truncate rounded bg-ds-surface px-2 py-1 text-small text-ds-fg">{callbackUrl}</code>
          <DsButton
            size="small"
            iconLeft={Copy}
            aria-label="Copy callback URL"
            onClick={() => navigator.clipboard.writeText(callbackUrl).then(() => dsToast("Copied"))}
          />
        </span>
      </li>
      <li>
        Put its client id and secret in the env as <code className="text-ds-fg">{meta.env[0]}</code> and{" "}
        <code className="text-ds-fg">{meta.env[1]}</code>, then restart or redeploy.
      </li>
    </ol>
  );
}

/**
 * Link back: a line at the end of a post ("Source: LinkedIn")
 * pointing to where it first appeared. Its labels are presets; each post
 * picks one in the editor.
 */
function SourceLineCard() {
  const [labels, setLabels] = useState<SourceLabel[] | null>(null);
  const [line, setLine] = useState<SourceLineSettings>(DEFAULT_SOURCE_LINE);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then(({ data }) => {
        setLabels(data.sourceLabels);
        setLine(data.sourceLine);
        setSaved(JSON.stringify([data.sourceLabels, data.sourceLine]));
      })
      .catch((error) => console.error("Failed to load settings:", error));
  }, []);

  if (!labels) return null;

  const dirty = JSON.stringify([labels, line]) !== saved;
  const update = (id: string, changes: Partial<SourceLabel>) =>
    setLabels(labels.map((l) => (l.id === id ? { ...l, ...changes } : l)));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceLabels: labels, sourceLine: line }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setLabels(json.data.sourceLabels);
      setLine(json.data.sourceLine);
      setSaved(JSON.stringify([json.data.sourceLabels, json.data.sourceLine]));
      dsToast("Link back saved");
    } catch (error) {
      dsToast("Couldn't save", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const platformOptions = [
    { value: "none", label: "No platform" },
    ...PLATFORMS.map((p) => ({ value: p, label: `Posting to ${PLATFORM_META[p].name}` })),
  ];
  const firstLabel = labels[0]?.name || "X";

  return (
    <SettingsSection
      id="link-back"
      title="Link back"
      description="A link at the end of a post, back to where it first appeared"
      note="Each post picks its label in the editor; a post you share from here to X or LinkedIn gets its label by itself."
    >
        <div className="flex items-center gap-ds-8">
          <label htmlFor="source-line-enabled" className="text-p text-ds-fg">
            Show the link on posts
          </label>
          <DsSwitch
            id="source-line-enabled"
            checked={line.enabled}
            onCheckedChange={(enabled) => setLine({ ...line, enabled })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="source-line-prefix" className="text-p text-ds-fg-muted">
            Text before the link
          </label>
          <DsInput
            id="source-line-prefix"
            value={line.prefix}
            maxLength={40}
            onChange={(e) => setLine({ ...line, prefix: e.target.value })}
            placeholder="Source:"
          />
          <p className="text-small text-ds-fg-muted">
            Reads as: {line.prefix.trim() && `${line.prefix.trim()} `}
            <span className="text-ds-fg underline underline-offset-2">{firstLabel}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-p text-ds-fg-muted">Labels</span>
          {labels.map((label) => (
            <div key={label.id} className="flex flex-wrap items-center gap-2">
              <DsInput
                value={label.name}
                maxLength={40}
                onChange={(e) => update(label.id, { name: e.target.value })}
                placeholder="Label"
                aria-label="Label name"
              />
              <div className="flex max-w-full items-center gap-2">
                <DsSelect
                  options={platformOptions.map((o) => ({
                    ...o,
                    // One label per platform.
                    disabled: o.value !== "none" && o.value !== label.platform && labels.some((l) => l.platform === o.value),
                  }))}
                  value={label.platform || "none"}
                  onValueChange={(value) => update(label.id, { platform: value === "none" ? null : (value as Platform) })}
                  className="min-w-0"
                />
                <DsButton
                  iconLeft={X}
                  aria-label={`Remove ${label.name || "label"}`}
                  onClick={() => setLabels(labels.filter((l) => l.id !== label.id))}
                />
              </div>
            </div>
          ))}
          <DsButton
            iconLeft={Plus}
            className="self-start"
            onClick={() => setLabels([...labels, { id: crypto.randomUUID(), name: "", platform: null }])}
          >
            Add label
          </DsButton>
        </div>

        <div className="flex">
          <DsButton variant="primary" onClick={save} disabled={!dirty} loading={saving}>
            {dirty ? "Save" : "Saved"}
          </DsButton>
        </div>
    </SettingsSection>
  );
}
