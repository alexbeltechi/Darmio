"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DsButton, DsField, DsInput } from "@beltechi/parabola";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { SITE_NAME_MAX } from "@/lib/cms/site";

/**
 * First-run setup: a fresh install has no users, so the admin opens here.
 * It names the site and creates the owner, then signs them in. Once someone
 * exists it sends you to the login page instead.
 */
export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [siteName, setSiteName] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((json) => (json.data?.needed ? setChecking(false) : router.replace("/admin/login")))
      .catch(() => setChecking(false));
  }, [router]);

  const mismatch = repeat.length > 0 && password !== repeat;
  const ready =
    siteName.trim() && name.trim() && username.trim() && password.length >= PASSWORD_MIN && password === repeat;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteName, name, username, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const signedIn = await signIn("credentials", { username: json.data.username, password, redirect: false });
      router.replace(signedIn?.ok ? "/admin" : "/admin/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set up the site");
      setSaving(false);
    }
  }

  if (checking) return <div className="min-h-screen bg-ds-bg" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-bg p-ds-20 text-ds-fg">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-ds-20 rounded-ds-lg bg-ds-surface-subtle p-ds-20">
        <div className="flex flex-col gap-ds-8">
          <h1 className="text-h3">Set up your site</h1>
          <p className="text-p text-ds-fg-muted">
            Name it and make your account. You can change both later in Settings.
          </p>
        </div>

        <DsField label="Site name" description="Your name or your brand. It's the logo until you add one.">
          <DsInput value={siteName} onChange={(e) => setSiteName(e.target.value)} maxLength={SITE_NAME_MAX} autoFocus />
        </DsField>
        <DsField label="Your name">
          <DsInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </DsField>
        <DsField label="Username" description="What you sign in with. An email works.">
          <DsInput value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </DsField>
        <DsField label="Password" description={`At least ${PASSWORD_MIN} characters.`}>
          <DsInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </DsField>
        <DsField label="Repeat it" error={mismatch ? "The two don't match" : undefined}>
          <DsInput type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
        </DsField>

        {error && <p className="text-p text-ds-error">{error}</p>}

        <DsButton type="submit" variant="primary" loading={saving} disabled={!ready}>
          Create my site
        </DsButton>
      </form>
    </div>
  );
}
