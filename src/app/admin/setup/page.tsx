"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { DsButton, DsField, DsInput } from "@beltechi/parabola";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { isEmail } from "@/lib/cms/email";
import { PROJECTS_MAX } from "@/lib/cms/projects";
import { ProjectFields, type ProjectDraft } from "@/components/admin/projects/project-fields";

type Step = "code" | "you" | "projects";

const emptyProject = (): ProjectDraft => ({ name: "", brain: "" });

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
 * 1. Your account, for the whole install: email and password. A name is
 *    optional, added later under Settings › Account.
 * 2. Your projects, as tabs: a name each, and maybe a brain.
 *
 * Nothing is saved until the last step; if the setup is finished elsewhere
 * meanwhile, the page moves on to sign-in by itself.
 */
export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [projects, setProjects] = useState<ProjectDraft[]>([emptyProject()]);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Set up Dharmify";
    const fromLink = new URLSearchParams(window.location.search).get("code") ?? "";
    const check = (first: boolean) =>
      fetch(first && fromLink ? `/api/setup?code=${encodeURIComponent(fromLink)}` : "/api/setup")
        .then((res) => res.json())
        .then((json) => {
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
  const projectsReady = projects.every((p) => p.name.trim());

  const updateProject = (index: number, draft: ProjectDraft) =>
    setProjects(projects.map((p, i) => (i === index ? draft : p)));
  const addProject = () => {
    setProjects([...projects, emptyProject()]);
    setTab(projects.length);
  };
  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
    setTab(Math.max(0, Math.min(tab, projects.length - 2)));
  };

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
    if (!youReady || !projectsReady || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), email, password, projects }),
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

  return (
    <div className="flex min-h-screen justify-center bg-ds-bg px-ds-20 py-ds-80 text-ds-fg">
      <div className="flex w-full max-w-[440px] flex-col gap-ds-40">
        <h1 className="text-h2">{step === "projects" ? "Your projects" : "Set up Dharmify"}</h1>

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
              if (youReady) setStep("projects");
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
            <div>
              <DsButton variant="primary" type="submit" disabled={!youReady}>
                Continue
              </DsButton>
            </div>
          </form>
        )}

        {step === "projects" && (
          <form
            className="flex flex-col gap-ds-40"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <div className="flex flex-wrap items-center gap-ds-4" role="tablist" aria-label="Projects">
              {projects.map((p, i) => (
                <DsButton key={i} type="button" role="tab" aria-selected={tab === i} pressed={tab === i} onClick={() => setTab(i)}>
                  {p.name.trim() || `Project ${i + 1}`}
                </DsButton>
              ))}
              {projects.length < PROJECTS_MAX && (
                <DsButton type="button" iconLeft={Plus} variant="text" onClick={addProject}>
                  Add project
                </DsButton>
              )}
            </div>

            <div className="flex flex-col gap-ds-20" role="tabpanel">
              <ProjectFields key={tab} draft={projects[tab]} onChange={(draft) => updateProject(tab, draft)} autoFocus />
              {projects.length > 1 && (
                <DsButton type="button" iconLeft={X} variant="text" destructive className="self-start" onClick={() => removeProject(tab)}>
                  Remove this project
                </DsButton>
              )}
            </div>

            {error && <p className="text-p text-ds-error">{error}</p>}

            <div className="flex flex-wrap items-center gap-ds-8">
              <DsButton iconLeft={ArrowLeft} type="button" onClick={() => setStep("you")} disabled={saving}>
                Back
              </DsButton>
              <DsButton variant="primary" type="submit" iconLeft={Check} loading={saving} disabled={!projectsReady}>
                {projects.length === 1 ? "Create my project" : `Create ${projects.length} projects`}
              </DsButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
