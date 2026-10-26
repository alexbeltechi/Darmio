"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Check, Copy, PenLine, Plus, X } from "lucide-react";
import { DsButton, DsField, DsInput, dsToast } from "@beltechi/parabola";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { PROJECTS_MAX } from "@/lib/cms/projects";
import { ProjectFields, type ProjectDraft } from "@/components/admin/projects/project-fields";

type Step = "start" | "agent" | "you" | "projects";

const emptyProject = (): ProjectDraft => ({ name: "", brain: "" });

/**
 * First-run onboarding (decisions, 2026-10-26). A fresh install has no users,
 * so the admin opens here. No window around it: the fields float on the page.
 *
 * 1. Start: set it up here, or hand it to your agent.
 * 2. You: what belongs to the whole install (your name, how you sign in).
 * 3. Projects: one or more, as tabs, each with a name and maybe a brain.
 *
 * Nothing is saved until the last step, so going back is free.
 */
export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>("start");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [projects, setProjects] = useState<ProjectDraft[]>([emptyProject()]);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((json) => (json.data?.needed ? setChecking(false) : router.replace("/admin/login")))
      .catch(() => setChecking(false));
  }, [router]);

  const mismatch = repeat.length > 0 && password !== repeat;
  const youReady = Boolean(name.trim() && username.trim().length >= 3 && password.length >= PASSWORD_MIN && password === repeat);
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

  async function create() {
    if (!youReady || !projectsReady || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, projects }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const signedIn = await signIn("credentials", { username: json.data.username, password, redirect: false });
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
        {step === "start" && <Start onHand={() => setStep("you")} onAgent={() => setStep("agent")} />}

        {step === "agent" && <WithAgent onBack={() => setStep("start")} onHand={() => setStep("you")} />}

        {step === "you" && (
          <form
            className="flex flex-col gap-ds-40"
            onSubmit={(e) => {
              e.preventDefault();
              if (youReady) setStep("projects");
            }}
          >
            <Heading step="Step 1 of 2" title="You" text="This is you across every project: what you're called and how you sign in." />
            <div className="flex flex-col gap-ds-20">
              <DsField label="Your name">
                <DsInput value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
              </DsField>
              <DsField label="Username" description="What you sign in with. An email works.">
                <DsInput value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </DsField>
              <DsField label="Password" description={`At least ${PASSWORD_MIN} characters.`}>
                <DsInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </DsField>
              <DsField label="Repeat password" error={mismatch ? "The two don't match" : undefined}>
                <DsInput type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" />
              </DsField>
            </div>
            <Actions>
              <DsButton iconLeft={ArrowLeft} type="button" onClick={() => setStep("start")}>
                Back
              </DsButton>
              <DsButton variant="primary" type="submit" disabled={!youReady}>
                Continue
              </DsButton>
            </Actions>
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
            <Heading
              step="Step 2 of 2"
              title="Your projects"
              text="Each project has its own posts, pages, library and settings, in its own database. Add every one you run; you can add more later."
            />

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

            <Actions>
              <DsButton iconLeft={ArrowLeft} type="button" onClick={() => setStep("you")} disabled={saving}>
                Back
              </DsButton>
              <DsButton variant="primary" type="submit" iconLeft={Check} loading={saving} disabled={!projectsReady}>
                {projects.length === 1 ? "Create my project" : `Create ${projects.length} projects`}
              </DsButton>
            </Actions>
          </form>
        )}
      </div>
    </div>
  );
}

function Heading({ step, title, text }: { step?: string; title: string; text: string }) {
  return (
    <div className="flex flex-col gap-ds-8">
      {step && <p className="text-small text-ds-fg-muted">{step}</p>}
      <h1 className="text-h2">{title}</h1>
      <p className="text-p text-ds-fg-muted">{text}</p>
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-ds-8">{children}</div>;
}

function Start({ onHand, onAgent }: { onHand: () => void; onAgent: () => void }) {
  return (
    <>
      <Heading
        title="Welcome to Dharmify"
        text="Set up your account and your projects. Do it here in two short steps, or let your agent do it from a chat."
      />
      <div className="flex flex-col gap-ds-8">
        <DsButton variant="primary" iconLeft={PenLine} onClick={onHand} className="justify-start">
          Set it up here
        </DsButton>
        <DsButton iconLeft={Bot} onClick={onAgent} className="justify-start">
          Set it up with my agent
        </DsButton>
      </div>
    </>
  );
}

/** The agent route: a prompt to paste, and this page moves on to sign-in once the agent has finished. */
function WithAgent({ onBack, onHand }: { onBack: () => void; onHand: () => void }) {
  const router = useRouter();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const prompt = `Set up my Dharmify at ${origin}. Read ${origin}/api/setup first: it says what to ask me and what to send.`;

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetch("/api/setup")
        .then((res) => res.json())
        .then((json) => json.data?.needed === false && router.replace("/admin/login"))
        .catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [router]);

  return (
    <>
      <Heading
        title="Set it up with your agent"
        text="Paste this into a chat with your agent (Claude Code, for example). It asks you for your name, a password and your projects, then sets them up. When it's done, this page takes you to sign in."
      />
      <p className="rounded-ds-md border border-ds-border p-ds-16 font-mono text-small break-words">{prompt}</p>
      <Actions>
        <DsButton iconLeft={ArrowLeft} onClick={onBack}>
          Back
        </DsButton>
        <div className="flex gap-ds-8">
          <DsButton variant="text" onClick={onHand}>
            Do it here instead
          </DsButton>
          <DsButton
            variant="primary"
            iconLeft={Copy}
            onClick={() => navigator.clipboard.writeText(prompt).then(() => dsToast("Copied"))}
          >
            Copy
          </DsButton>
        </div>
      </Actions>
    </>
  );
}
