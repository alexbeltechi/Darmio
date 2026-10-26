"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, Check, Copy, Plus, X } from "lucide-react";
import { DsButton, DsField, DsInfoCard, DsInput, dsToast } from "@beltechi/parabola";
import { PASSWORD_MIN } from "@/lib/cms/password";
import { PROJECTS_MAX } from "@/lib/cms/projects";
import { ProjectFields, type ProjectDraft } from "@/components/admin/projects/project-fields";
import { cn } from "@/lib/utils";

type Step = "you" | "projects";

const emptyProject = (): ProjectDraft => ({ name: "", brain: "" });

/** The outline at the top, which is also where you are. */
const OUTLINE: { step: Step | "create"; label: string }[] = [
  { step: "you", label: "You: how you sign in" },
  { step: "projects", label: "Your projects: a site, a newsletter, a brand" },
  { step: "create", label: "Start creating" },
];

/**
 * First-run onboarding (decisions, 2026-10-26). A fresh install has no users,
 * so the admin opens here, straight on the first step. No window around it:
 * the fields float on the page, and buttons keep their own width.
 *
 * 1. You: what belongs to the whole install (your name, how you sign in).
 * 2. Your projects, as tabs: a name each, and maybe a brain.
 *
 * An info card offers the same through an agent. Nothing is saved until the
 * last step; if an agent finishes the setup meanwhile, the page moves on to
 * sign-in by itself.
 */
export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>("you");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [projects, setProjects] = useState<ProjectDraft[]>([emptyProject()]);
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Set up Dharmify";
    const check = (first: boolean) =>
      fetch("/api/setup")
        .then((res) => res.json())
        .then((json) => {
          if (json.data?.needed === false) router.replace("/admin/login");
          else if (first) setChecking(false);
        })
        .catch(() => first && setChecking(false));
    check(true);
    const timer = window.setInterval(() => check(false), 5000);
    return () => window.clearInterval(timer);
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
        <div className="flex flex-col gap-ds-16">
          <h1 className="text-h2">Set up Dharmify</h1>
          <ol className="flex flex-col gap-ds-4 text-p">
            {OUTLINE.map((item, i) => (
              <li key={item.step} className={cn(item.step === step ? "text-ds-fg" : "text-ds-fg-muted")}>
                {i + 1}. {item.label}
              </li>
            ))}
          </ol>
        </div>

        {step === "you" && (
          <form
            className="flex flex-col gap-ds-40"
            onSubmit={(e) => {
              e.preventDefault();
              if (youReady) setStep("projects");
            }}
          >
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
            <div>
              <DsButton variant="primary" type="submit" disabled={!youReady}>
                Continue
              </DsButton>
            </div>
            <AgentCard />
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

/** The same setup, done by an agent: a prompt to paste. GET /api/setup tells it the rest. */
function AgentCard() {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const prompt = `Set up my Dharmify at ${origin}. Read ${origin}/api/setup first: it says what to ask me and what to send.`;

  return (
    <DsInfoCard icon={Bot}>
      <p>Rather have your agent do it? Paste this into Claude Code, or the agent or builder you use. This page moves on by itself when it&apos;s done.</p>
      <p className="font-mono text-small break-words text-ds-fg-muted">{prompt}</p>
      <DsButton
        type="button"
        size="small"
        iconLeft={Copy}
        className="self-start"
        onClick={() => navigator.clipboard.writeText(prompt).then(() => dsToast("Copied"))}
      >
        Copy
      </DsButton>
    </DsInfoCard>
  );
}
