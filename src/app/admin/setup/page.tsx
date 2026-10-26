"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DsButton, DsField, DsInput } from "@beltechi/parabola";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { isEmail } from "@/lib/cms/email";
import { InstallProblemNotice } from "@/components/admin/install-problem";
import { installProblem, type InstallProblem } from "@/lib/cms/install-problems";

type Step = "code" | "you";

/**
 * First-run onboarding (decisions, 2026-10-26). A fresh install has no users,
 * so the admin opens here, straight on the first step, titled by the step.
 * No window around it: the fields float on the page, and buttons keep their
 * own width.
 *
 * You arrive by the setup link your installer (usually your AI, following
 * INSTALL.md) hands you: `/admin/setup?code=…`. The code is checked first;
 * without a good one the page asks for it and goes no further, so nobody
 * else can claim the install.
 *
 * Then one step: your account, for the whole install (email and password; a
 * name is optional, under Settings › Account). Creating it also makes a
 * first project and opens the admin; more projects come from the menu
 * behind the letter, later (decisions, 2026-10-26). If the setup is
 * finished elsewhere meanwhile, the page moves on to sign-in by itself.
 */
export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [problem, setProblem] = useState<InstallProblem | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Set up Dharmify";
    const fromLink = new URLSearchParams(window.location.search).get("code") ?? "";
    const check = (first: boolean) =>
      fetch(first && fromLink ? `/api/setup?code=${encodeURIComponent(fromLink)}` : "/api/setup")
        .then((res) => res.json())
        .then((json) => {
          // The install can't do its job yet (no database, say): say so, and keep checking.
          const found = installProblem(json.code);
          setProblem(found);
          if (found) return first && setChecking(false);
          if (json.data?.needed === false) return router.replace("/admin/login");
          if (!first) return;
          // A good code in the link goes straight to the account step.
          if (json.data?.codeOk) {
            setCode(fromLink);
            setStep("you");
          }
          setChecking(false);
        })
        .catch(() => first && setChecking(false));
    check(true);
    const timer = window.setInterval(() => check(false), 5000);
    return () => window.clearInterval(timer);
  }, [router]);

  const mismatch = repeat.length > 0 && password !== repeat;
  const badEmail = email.trim().length > 0 && !isEmail(email);
  const youReady = Boolean(isEmail(email) && password.length >= PASSWORD_MIN && password === repeat);
  async function checkCode() {
    if (!code.trim() || checkingCode) return;
    setCheckingCode(true);
    setCodeError(null);
    // A pasted link works as well as the code on its own.
    const pasted = code.trim();
    let value = pasted;
    try {
      value = new URL(pasted).searchParams.get("code") ?? pasted;
    } catch {
      // Not a link: the code itself.
    }
    setCode(value);
    try {
      const res = await fetch(`/api/setup?code=${encodeURIComponent(value)}`);
      const json = await res.json();
      if (json.data?.codeOk) setStep("you");
      else if (json.data?.hasCode === false) setCodeError("This site isn't ready to set up yet. Ask your AI to finish the install.");
      else setCodeError("That's not this site's setup link. Ask your AI for it again.");
    } catch {
      setCodeError("Couldn't reach the server. Try again.");
    } finally {
      setCheckingCode(false);
    }
  }

  async function create() {
    if (!youReady || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), email, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const signedIn = await signIn("credentials", { username: json.data.email, password, redirect: false });
      router.replace(signedIn?.ok ? "/admin" : "/admin/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set up");
      setSaving(false);
    }
  }

  if (checking) return <div className="min-h-screen bg-ds-bg" />;
  if (problem) return <InstallProblemNotice problem={problem} />;

  return (
    <div className="flex min-h-screen justify-center bg-ds-bg px-ds-20 py-ds-80 text-ds-fg">
      <div className="flex w-full max-w-[440px] flex-col gap-ds-40">
        <h1 className="text-h2">Set up Dharmify</h1>

        {step === "code" && (
          <form
            className="flex flex-col gap-ds-40"
            onSubmit={(e) => {
              e.preventDefault();
              checkCode();
            }}
          >
            <p className="text-p text-ds-fg-muted">
              Open the setup link your AI gave you when it installed this site. Lost it? Ask your AI for
              your Dharmify setup link, or paste it here.
            </p>
            <DsField label="Setup link" error={codeError ?? undefined}>
              <DsInput value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" placeholder="https://…/admin/setup?code=…" />
            </DsField>
            <div>
              <DsButton variant="primary" type="submit" loading={checkingCode} disabled={!code.trim()}>
                Continue
              </DsButton>
            </div>
          </form>
        )}

        {step === "you" && (
          <form
            className="flex flex-col gap-ds-40"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <div className="flex flex-col gap-ds-20">
              <DsField label="Email" error={badEmail ? "That doesn't look like an email" : undefined}>
                <DsInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
              </DsField>
              <DsField label="Password" description={`At least ${PASSWORD_MIN} characters.`}>
                <DsInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </DsField>
              <DsField label="Repeat password" error={mismatch ? "The two don't match" : undefined}>
                <DsInput type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
              </DsField>
            </div>
            {error && <p className="text-p text-ds-error">{error}</p>}
            <div>
              <DsButton variant="primary" type="submit" loading={saving} disabled={!youReady}>
                Create my account
              </DsButton>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
