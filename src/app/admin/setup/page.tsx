"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DsButton, DsCopyField, DsField, DsInput, DsRadio, DsRadioGroup, dsToast } from "@beltechi/parabola";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { isEmail } from "@/lib/cms/email";
import { InstallProblemNotice } from "@/components/admin/install-problem";
import { installProblem, type InstallProblem } from "@/lib/cms/install-problems";
import type { ExampleSite } from "@/lib/cms/examples";

// The "Start with" choices: an example by its folder name, or nothing.
const EMPTY = "empty";
const exampleChoice = (name: string) => `example:${name}`;

/**
 * First-run onboarding. A fresh install has no users,
 * so the admin opens here. No window around it: the fields float on the page,
 * and buttons keep their own width.
 *
 * You arrive by the setup link your installer (usually your AI, following
 * INSTALL.md) hands you: `/admin/setup?code=…`. A good code opens straight on
 * the one step, your account for the whole install (email and password; a
 * name is optional, under Account). Creating it also makes a first project
 * and opens the admin. When the install carries example sites, the step also
 * asks what the site starts with: the first example (preselected, so a new
 * maker sees a whole site first) or nothing. The example loads once they're
 * signed in, and Settings › Examples takes it out again in one go.
 *
 * Without a good code (no link, a wrong one, or a lost one) there is no form:
 * the page says the site isn't set up yet and hands over a prompt that asks
 * the installing AI for the link. So nobody else can
 * claim the install. If the setup is finished elsewhere meanwhile, the page
 * moves on to sign-in by itself.
 */
export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [badLink, setBadLink] = useState(false);
  const [address, setAddress] = useState("");
  const [problem, setProblem] = useState<InstallProblem | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [examples, setExamples] = useState<ExampleSite[]>([]);
  const [startWith, setStartWith] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  // While the account is being made, the check below would see it and leave for sign-in mid-way.
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Set up Darmio";
    setAddress(window.location.origin);
    const fromLink = new URLSearchParams(window.location.search).get("code") ?? "";
    const check = (first: boolean) =>
      fetch(first && fromLink ? `/api/setup?code=${encodeURIComponent(fromLink)}` : "/api/setup")
        .then((res) => res.json())
        .then((json) => {
          if (savingRef.current) return;
          // The install can't do its job yet (no database, say): say so, and keep checking.
          const found = installProblem(json.code);
          setProblem(found);
          if (found) return first && setChecking(false);
          if (json.data?.needed === false) return router.replace("/admin/login");
          if (!first) return;
          // A good code in the link opens the account step; anything else, the not-set-up page.
          if (json.data?.codeOk) setCode(fromLink);
          else setBadLink(Boolean(fromLink));
          const offered: ExampleSite[] = Array.isArray(json.data?.examples) ? json.data.examples : [];
          setExamples(offered);
          setStartWith(offered[0] ? exampleChoice(offered[0].name) : EMPTY);
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
  async function create() {
    if (!youReady || saving) return;
    setSaving(true);
    savingRef.current = true;
    setError(null);
    let json: { data?: { email: string }; error?: string };
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email, password }),
      });
      json = await res.json();
      if (!res.ok || !json.data) throw new Error(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set up");
      setSaving(false);
      savingRef.current = false;
      return;
    }
    const signedIn = await signIn("credentials", { username: json.data.email, password, redirect: false });
    if (!signedIn?.ok) return router.replace("/admin/login");
    // Signed in, the example loads into the new project like any admin change, off this public route.
    const example = examples.find((site) => exampleChoice(site.name) === startWith);
    if (example) {
      const res = await fetch("/api/admin/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: example.name }),
      }).catch(() => null);
      if (!res?.ok) {
        dsToast.error("Couldn't add the example site", {
          description: "Your account is ready. Add it from Settings › Examples.",
        });
      }
    }
    router.replace("/admin");
  }

  if (checking) return <div className="min-h-screen bg-ds-bg" />;
  if (problem) return <InstallProblemNotice problem={problem} />;

  if (!code) {
    return (
      <div className="flex min-h-screen justify-center bg-ds-bg px-ds-20 py-ds-80 text-ds-fg">
        <div className="flex w-full max-w-[440px] flex-col gap-ds-40">
          <div className="flex flex-col gap-ds-8">
            <h1 className="text-h2">Set up Darmio</h1>
            {badLink && <p className="text-p text-ds-error">That setup link didn&apos;t work.</p>}
          </div>
          <div className="flex flex-col gap-ds-8">
            <p className="text-p text-ds-fg-muted">This site isn&apos;t set up yet. Paste this into the AI that installed it:</p>
            <DsCopyField
              wrap
              value={`Give me the setup link for my Darmio site at ${address}`}
              aria-label="Prompt for your AI"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center bg-ds-bg px-ds-20 py-ds-80 text-ds-fg">
      <div className="flex w-full max-w-[440px] flex-col gap-ds-40">
        <h1 className="text-h2">Set up Darmio</h1>

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
          {examples.length > 0 && (
            <div role="group" aria-labelledby="start-with" className="flex flex-col gap-ds-8">
              <p id="start-with" className="text-p">Start with</p>
              <DsRadioGroup value={startWith} onValueChange={setStartWith} className="gap-ds-16" aria-labelledby="start-with">
                {[
                  ...examples.map((site) => ({
                    value: exampleChoice(site.name),
                    label: site.label,
                    hint: `${site.about ? `${site.about} ` : ""}Remove it in Settings when you're ready for your own.`,
                  })),
                  { value: EMPTY, label: "An empty site", hint: "Nothing in it yet. You write the first post." },
                ].map(({ value, label, hint }) => (
                  <label key={value} htmlFor={`start-with-${value}`} className="flex cursor-pointer items-start gap-ds-8">
                    <DsRadio value={value} id={`start-with-${value}`} className="mt-[3px]" />
                    <span className="flex flex-1 flex-col gap-1">
                      <span className="text-p">{label}</span>
                      <span className="text-small text-ds-fg-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </DsRadioGroup>
            </div>
          )}
          {error && <p className="text-p text-ds-error">{error}</p>}
          <div className="flex flex-col items-start gap-ds-8">
            <DsButton variant="primary" type="submit" loading={saving} disabled={!youReady}>
              Create my account
            </DsButton>
            {saving && startWith !== EMPTY && <p className="text-small text-ds-fg-muted">Setting up your site with the example. This takes a moment.</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
