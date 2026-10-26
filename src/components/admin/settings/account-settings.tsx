"use client";

import { useEffect, useState } from "react";
import { DS_FIELDS_CLASS, DsButton, DsField, DsInput, dsToast } from "@beltechi/parabola";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { SettingsSection } from "./settings-section";

type Account = { name: string; email: string; role: string };

/**
 * Who's signed in and a change-password form, so a new password never needs
 * an agent or the database (decisions, 2026-10-24). Locked out, there's
 * `npm run reset-password`.
 */
export function AccountSettings() {
  const [account, setAccount] = useState<Account | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    fetch("/api/admin/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.data) return;
        setAccount(json.data);
        setName(json.data.name ?? "");
      })
      .catch(() => {});
  }, []);

  const nameChanged = account !== null && name.trim() !== (account.name ?? "");

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (!nameChanged || savingName || !account) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAccount({ ...account, name: json.data.name });
      dsToast.success("Name saved");
    } catch (error) {
      dsToast.error("Couldn't save the name", { description: error instanceof Error ? error.message : undefined });
    } finally {
      setSavingName(false);
    }
  }

  const mismatch = repeat.length > 0 && next !== repeat;
  const tooShort = next.length > 0 && next.length < PASSWORD_MIN;
  const ready = current.length > 0 && next.length >= PASSWORD_MIN && next === repeat;

  async function change(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCurrent("");
      setNext("");
      setRepeat("");
      dsToast.success("Password changed");
    } catch (error) {
      dsToast.error("Couldn't change the password", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      id="account"
      title="You"
      description={
        account
          ? `Signed in as ${account.email}, ${account.role}.`
          : "Who's signed in, and a new password."
      }
    >
      <form onSubmit={saveName} className="flex flex-col gap-5">
        <DsField label="Name (optional)" description="Shown where you're credited. Your email is enough to sign in.">
          <DsInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" />
        </DsField>
        <DsButton type="submit" disabled={!nameChanged || savingName} loading={savingName} className="self-start">
          Save name
        </DsButton>
      </form>

      <form onSubmit={change} className="flex flex-col gap-5">
        <div className={DS_FIELDS_CLASS}>
          <DsField label="Current password">
            <DsInput
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </DsField>
          <DsField
            label="New password"
            description={`At least ${PASSWORD_MIN} characters.`}
            error={tooShort ? `At least ${PASSWORD_MIN} characters` : undefined}
          >
            <DsInput
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </DsField>
          <DsField label="Repeat it" error={mismatch ? "The two don't match" : undefined}>
            <DsInput
              type="password"
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </DsField>
        </div>
        <DsButton type="submit" disabled={!ready || saving} loading={saving} className="self-start">
          Change password
        </DsButton>
        <p className="text-small text-ds-fg-muted">
          Locked out? From the project folder, <code className="font-mono">npm run reset-password</code> sets a new one.
        </p>
      </form>
    </SettingsSection>
  );
}
