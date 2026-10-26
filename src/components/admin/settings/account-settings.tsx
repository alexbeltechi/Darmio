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

  useEffect(() => {
    fetch("/api/admin/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data && setAccount(json.data))
      .catch(() => {});
  }, []);

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
      title="Account"
      description={
        account
          ? `Signed in as ${account.name} (${account.email}), ${account.role}.`
          : "Who's signed in, and a new password."
      }
    >
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-small text-ds-fg-muted">
            Locked out? From the project folder, <code className="font-mono">npm run reset-password</code> sets a new one.
          </p>
          <DsButton type="submit" variant="primary" disabled={!ready || saving} loading={saving}>
            Change password
          </DsButton>
        </div>
      </form>
    </SettingsSection>
  );
}
