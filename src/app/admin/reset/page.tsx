"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { DsButton, DsCopyField, DsField, DsInput } from "@beltechi/parabola";
import { PASSWORD_MIN } from "@/lib/cms/password";

/**
 * A new password from a one-time reset link (decisions, 2026-10-26): the
 * owner's AI makes the link (`npm run reset-link`), the owner chooses the
 * password here, never in the chat, and is signed in. A link that's wrong,
 * spent or expired says so and offers the prompt for a new one. Floats on
 * the page like sign-in and setup.
 */
function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "New password";
    fetch(`/api/reset?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => setEmail(json.data?.ok ? json.data.email : null))
      .catch(() => setEmail(null))
      .finally(() => {
        setAddress(window.location.origin);
        setChecked(true);
      });
  }, [token]);

  const mismatch = repeat.length > 0 && password !== repeat;
  const ready = password.length >= PASSWORD_MIN && password === repeat;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || saving || !email) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const signedIn = await signIn("credentials", { username: json.data.email, password, redirect: false });
      window.location.assign(signedIn?.ok ? "/admin" : "/admin/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set the password");
      setSaving(false);
    }
  }

  if (!checked) return <div className="min-h-screen bg-ds-bg" />;

  return (
    <div className="flex min-h-screen justify-center bg-ds-bg px-ds-20 py-ds-80 text-ds-fg">
      <div className="flex w-full max-w-[440px] flex-col gap-ds-40">
        <div className="flex flex-col gap-ds-8">
          <h1 className="text-h2">New password</h1>
          {email && <p className="text-p text-ds-fg-muted">For {email}.</p>}
        </div>

        {email ? (
          <form onSubmit={save} className="flex flex-col gap-ds-40">
            <div className="flex flex-col gap-ds-20">
              <DsField label="New password" description={`At least ${PASSWORD_MIN} characters.`}>
                <DsInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
              </DsField>
              <DsField label="Repeat it" error={mismatch ? "The two don't match" : undefined}>
                <DsInput type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
              </DsField>
            </div>
            {error && <p className="text-p text-ds-error">{error}</p>}
            <div>
              <DsButton variant="primary" type="submit" loading={saving} disabled={!ready}>
                Set password
              </DsButton>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-ds-8">
            <p className="text-p text-ds-error">That reset link didn&apos;t work. It may have expired or been used.</p>
            <p className="text-p text-ds-fg-muted">Paste this into the AI that installed it for a new one:</p>
            <DsCopyField wrap value={`Give me a password reset link for my Dharmify site at ${address}`} aria-label="Prompt for your AI" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ds-bg p-4">
          <Loader2 aria-hidden className="size-5 animate-spin text-ds-fg-muted" />
        </div>
      }
    >
      <ResetForm />
    </Suspense>
  );
}
