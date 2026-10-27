"use client";

import { useEffect, useState } from "react";
import { DsButton, DsField, DsInput, dsToast } from "@beltechi/parabola";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { isEmail } from "@/lib/cms/email";
import { SettingsSection } from "./settings-section";

type Account = { name: string; email: string; role: string };

/** PATCH /api/admin/account, throwing the server's reason when it says no. */
async function patchAccount(body: Record<string, string>): Promise<Record<string, string>> {
  const res = await fetch("/api/admin/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

const reason = (error: unknown) => ({ description: error instanceof Error ? error.message : undefined });

/**
 * You, across the install (decisions, 2026-10-26), as two cards like a
 * project's settings: Account (your name, and the email you sign in with)
 * and Password. A new email asks for your password, since Darmio can't
 * send a confirmation link yet; it says so under the field.
 */
export function AccountSettings() {
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetch("/api/admin/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data && setAccount(json.data))
      .catch(() => {});
  }, []);

  return (
    <>
      <AccountCard account={account} onChange={setAccount} />
      <PasswordCard />
    </>
  );
}

function AccountCard({ account, onChange }: { account: Account | null; onChange: (account: Account) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Fill the fields once the account has loaded.
  const [loaded, setLoaded] = useState<Account | null>(null);
  if (account && account !== loaded) {
    setLoaded(account);
    setName(account.name ?? "");
    setEmail(account.email);
  }

  const nameChanged = account !== null && name.trim() !== (account.name ?? "");
  const emailChanged = account !== null && email.trim().toLowerCase() !== account.email;
  const badEmail = emailChanged && email.trim().length > 0 && !isEmail(email);

  async function saveName(event: React.FormEvent) {
    event.preventDefault();
    if (!account || !nameChanged || savingName) return;
    setSavingName(true);
    try {
      const data = await patchAccount({ name });
      onChange({ ...account, name: data.name });
      dsToast.success("Name saved");
    } catch (error) {
      dsToast.error("Couldn't save the name", reason(error));
    } finally {
      setSavingName(false);
    }
  }

  async function saveEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!account || !emailChanged || badEmail || !password || savingEmail) return;
    setSavingEmail(true);
    try {
      const data = await patchAccount({ newEmail: email, currentPassword: password });
      onChange({ ...account, email: data.email });
      setPassword("");
      dsToast.success("Email changed", { description: `Sign in with ${data.email} from now on.` });
    } catch (error) {
      dsToast.error("Couldn't change the email", reason(error));
    } finally {
      setSavingEmail(false);
    }
  }

  return (
    <SettingsSection
      id="account"
      title="Account"
      description={account ? `Signed in as ${account.email}, ${account.role}.` : "Your name and the email you sign in with."}
    >
      <form onSubmit={saveName} className="flex flex-col gap-5">
        <DsField label="Name (optional)" description="Shown where you're credited.">
          <DsInput value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" disabled={!account} />
        </DsField>
        <DsButton type="submit" disabled={!nameChanged || savingName} loading={savingName} className="self-start">
          Save name
        </DsButton>
      </form>

      <form onSubmit={saveEmail} className="flex flex-col gap-5">
        <DsField
          label="Email"
          description="You sign in with it. Darmio can't email you yet, so there's no confirmation link: check it's right."
          error={badEmail ? "That doesn't look like an email" : undefined}
        >
          <DsInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" disabled={!account} />
        </DsField>
        {emailChanged && (
          <DsField label="Your password" description="To change the email you sign in with.">
            <DsInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </DsField>
        )}
        <DsButton
          type="submit"
          disabled={!emailChanged || badEmail || !password || savingEmail}
          loading={savingEmail}
          className="self-start"
        >
          Change email
        </DsButton>
      </form>
    </SettingsSection>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);

  const mismatch = repeat.length > 0 && next !== repeat;
  const tooShort = next.length > 0 && next.length < PASSWORD_MIN;
  const ready = current.length > 0 && next.length >= PASSWORD_MIN && next === repeat;

  async function change(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    try {
      await patchAccount({ currentPassword: current, newPassword: next });
      setCurrent("");
      setNext("");
      setRepeat("");
      dsToast.success("Password changed");
    } catch (error) {
      dsToast.error("Couldn't change the password", reason(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      id="password"
      title="Password"
      description="The one you sign in with"
      note="Forgotten it? Sign out and use “Forgot your password?” on the sign-in page."
    >
      <form onSubmit={change} className="flex flex-col gap-5">
        <DsField label="Current password">
          <DsInput type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </DsField>
        <DsField
          label="New password"
          description={`At least ${PASSWORD_MIN} characters.`}
          error={tooShort ? `At least ${PASSWORD_MIN} characters` : undefined}
        >
          <DsInput type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </DsField>
        <DsField label="Repeat it" error={mismatch ? "The two don't match" : undefined}>
          <DsInput type="password" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </DsField>
        <DsButton type="submit" disabled={!ready || saving} loading={saving} className="self-start">
          Change password
        </DsButton>
      </form>
    </SettingsSection>
  );
}
