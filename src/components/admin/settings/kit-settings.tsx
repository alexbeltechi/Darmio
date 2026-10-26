"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Mail } from "lucide-react";
import { DS_FIELDS_CLASS, DsButton, DsConfirmDialog, DsField, DsInput, DsPill, DsSelect, dsToast } from "@beltechi/parabola";
import { KIT_DEVELOPER_URL, KIT_URL, type KitOption, type KitStatus } from "@/lib/newsletter/types";

const STATE_PILL: Record<KitStatus["state"], { label: string; variant: "dark" | "light" | "highlight" }> = {
  connected: { label: "Connected", variant: "dark" },
  rejected: { label: "Key rejected", variant: "highlight" },
  unconfigured: { label: "Not set up", variant: "light" },
};

const NONE = "none";

async function readJson(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

/**
 * Settings → Integrations → Kit (anchored `#kit`): the newsletter list behind
 * `POST /api/subscribe`. Paste the v4 API key, pick the form people join and
 * the tag that marks this site, send yourself a test.
 */
export function KitSection() {
  const [status, setStatus] = useState<KitStatus | null>(null);
  const [options, setOptions] = useState<{ forms: KitOption[]; tags: KitOption[] } | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [busy, setBusy] = useState<"key" | "choice" | "test" | "disconnect" | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    fetch("/api/admin/integrations/kit")
      .then(readJson)
      .then(({ data }) => setStatus(data))
      .catch((error) => console.error("Failed to load the Kit settings:", error));
  }, []);

  // Forms and tags come from Kit itself, once there's a working key.
  const loadOptions = useCallback(async () => {
    setOptionsError(null);
    try {
      const { data } = await readJson(await fetch("/api/admin/integrations/kit/options"));
      setOptions(data);
    } catch (error) {
      setOptions(null);
      setOptionsError(error instanceof Error ? error.message : "Couldn't read from Kit");
    }
  }, []);

  useEffect(() => {
    if (status?.state === "connected") loadOptions();
  }, [status?.state, status?.connectedAt, loadOptions]);

  const saveKey = async () => {
    setBusy("key");
    try {
      const { data } = await readJson(
        await fetch("/api/admin/integrations/kit", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: key }),
        })
      );
      setStatus(data);
      setKey("");
      setEditingKey(false);
      dsToast("Kit connected", { description: `Signed in as ${data.account?.name}` });
    } catch (error) {
      dsToast("Couldn't connect Kit", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const choose = async (what: "form" | "tag", value: string) => {
    const list = what === "form" ? options?.forms : options?.tags;
    const chosen = value === NONE ? null : (list?.find((o) => String(o.id) === value) ?? null);
    setBusy("choice");
    try {
      const { data } = await readJson(
        await fetch("/api/admin/integrations/kit", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [what]: chosen }),
        })
      );
      setStatus(data);
    } catch (error) {
      dsToast(`Couldn't save the ${what}`, { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy("test");
    try {
      const { data } = await readJson(await fetch("/api/admin/integrations/kit/test", { method: "POST" }));
      dsToast("Test sign-up sent", { description: `${data.email} was added to the form${status?.tag ? ` and tagged ${status.tag.name}` : ""}. Check Kit, and your inbox.` });
    } catch (error) {
      dsToast("Couldn't subscribe", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      await readJson(await fetch("/api/admin/integrations/kit", { method: "DELETE" }));
      setStatus({ state: "unconfigured" });
      setOptions(null);
      dsToast("Kit disconnected");
    } catch (error) {
      dsToast("Couldn't disconnect Kit", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setBusy(null);
      setConfirmDisconnect(false);
    }
  };

  const state = status?.state;
  const showKeyField = state === "unconfigured" || state === "rejected" || editingKey;

  return (
    <section id="kit" className="flex scroll-mt-6 flex-col gap-3">
      <div className="flex items-center gap-3">
        <Mail className="size-5 shrink-0 text-ds-fg" />
        <h3 className="flex min-w-0 flex-1 flex-col text-h3 text-ds-fg">
          {/* Links out to the account, so it's clear which Kit this is. */}
          <a
            href={KIT_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="Open Kit"
            className="inline-flex items-center gap-1 self-start rounded-ds-md hover:opacity-70 ds-focus"
          >
            Kit
            <ExternalLink aria-hidden className="size-3 text-ds-fg-muted" />
          </a>
          {state === "connected" && status?.account && (
            <span className="truncate text-small text-ds-fg-muted">
              {status.account.name}
              {status.account.email && status.account.email !== status.account.name ? ` · ${status.account.email}` : ""}
            </span>
          )}
        </h3>
        {state && <DsPill variant={STATE_PILL[state].variant}>{STATE_PILL[state].label}</DsPill>}
      </div>

      <div className="flex flex-col gap-1 text-p text-ds-fg-muted">
        <p>
          The newsletter list. Sign-ups from this site&apos;s newsletter block (and <code className="text-ds-fg">POST /api/subscribe</code>) go to the
          form you pick, tagged for this site, so one Kit account can serve several sites.
        </p>
        {state === "rejected" && <p className="text-ds-highlight">{status?.error} Paste the key again.</p>}
      </div>

      {showKeyField && (
        <div className="flex flex-col gap-3">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-p text-ds-fg-muted">
            <li>
              In Kit, open{" "}
              <a href={KIT_DEVELOPER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ds-fg underline underline-offset-2 hover:opacity-70">
                Settings → Developer <ExternalLink className="size-3" />
              </a>{" "}
              and create a <strong className="text-ds-fg">v4 API key</strong>.
            </li>
            <li>Paste it here. It&apos;s stored encrypted and never shown again.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-2">
            <DsInput
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="kit_…"
              aria-label="Kit API key"
              autoComplete="off"
            />
            <div className="flex gap-2">
              <DsButton variant="primary" onClick={saveKey} disabled={!key.trim()} loading={busy === "key"}>
                {state === "connected" ? "Replace key" : "Connect Kit"}
              </DsButton>
              {editingKey && <DsButton onClick={() => setEditingKey(false)}>Cancel</DsButton>}
            </div>
          </div>
        </div>
      )}

      {state === "connected" && (
        <>
          <div className={DS_FIELDS_CLASS}>
            <DsField
              label="Form people join"
              description={!status?.form ? "Pick one: until then, sign-ups are refused." : undefined}
            >
              <DsSelect
                options={[{ value: NONE, label: "No form" }, ...(options?.forms ?? (status?.form ? [status.form] : [])).map((o) => ({ value: String(o.id), label: o.name }))]}
                value={status?.form ? String(status.form.id) : NONE}
                onValueChange={(v) => choose("form", v)}
                disabled={!options || busy === "choice"}
              />
            </DsField>
            <DsField label="Tag for this site" description="Tells Kit which site someone signed up on.">
              <DsSelect
                options={[{ value: NONE, label: "No tag" }, ...(options?.tags ?? (status?.tag ? [status.tag] : [])).map((o) => ({ value: String(o.id), label: o.name }))]}
                value={status?.tag ? String(status.tag.id) : NONE}
                onValueChange={(v) => choose("tag", v)}
                disabled={!options || busy === "choice"}
              />
            </DsField>
          </div>
          {optionsError && (
            <p className="text-small text-ds-highlight">
              Couldn&apos;t read forms and tags: {optionsError}{" "}
              <button type="button" onClick={loadOptions} className="underline underline-offset-2 hover:opacity-70">
                Try again
              </button>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <DsButton variant="primary" onClick={sendTest} disabled={!status?.form} loading={busy === "test"}>
              Send a test
            </DsButton>
            {!editingKey && <DsButton onClick={() => setEditingKey(true)}>Replace key</DsButton>}
            <DsButton onClick={() => setConfirmDisconnect(true)} loading={busy === "disconnect"}>
              Disconnect
            </DsButton>
          </div>
          <p className="text-small text-ds-fg-muted">A test signs up your own address (your sign-in, or the Kit account&apos;s email), the way a visitor&apos;s would go.</p>
        </>
      )}

      {state === "rejected" && (
        <div className="flex">
          <DsButton onClick={() => setConfirmDisconnect(true)} loading={busy === "disconnect"}>
            Disconnect
          </DsButton>
        </div>
      )}

      <DsConfirmDialog
        open={confirmDisconnect}
        onOpenChange={(open) => !open && setConfirmDisconnect(false)}
        title="Disconnect Kit?"
        description="Sign-ups stop until a key is pasted again. People already on the list stay in Kit; to revoke the key fully, delete it in Kit's developer settings."
        confirmLabel="Disconnect"
        destructive
        loading={busy === "disconnect"}
        onConfirm={disconnect}
      />
    </section>
  );
}
