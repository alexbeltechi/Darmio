"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { DsCopyField, DsDisclosure } from "@beltechi/parabola";
import { cn } from "@/lib/utils";

/**
 * What to paste into your AI to do a section's job for you. `<site>` in the
 * prompt becomes "my Darmio site at" and this site's address, so the AI
 * knows which install it's working on.
 */
export type AiPrompt = { label?: string; prompt: string };

/** The site's address, once the page is in the browser (empty while it renders on the server). */
const noSubscribe = () => () => {};
function useSiteAddress(): string {
  return React.useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
}

/**
 * How to do something with your AI, folded away under "Show AI
 * instructions" (DsDisclosure) at the foot of a settings card, so the card
 * shows what's set and keeps the how-to out of the way: a line saying where
 * to paste, then each prompt in a field with its copy button. `children`
 * goes after the prompts: the steps to do it by hand, for whoever wants them.
 */
export function AiInstructions({ prompts, children }: { prompts: AiPrompt[]; children?: React.ReactNode }) {
  const address = useSiteAddress();
  const site = `my Darmio site at ${address || "this site's address"}`;
  return (
    <DsDisclosure label="AI instructions">
      <p className="text-p text-ds-fg-muted">
        Paste this into the AI that set up your site (Claude Code, Codex or another that can run commands). It does the work and
        tells you what it changed.
      </p>
      {prompts.map(({ label, prompt }) => (
        <div key={prompt} className="flex flex-col gap-ds-8">
          {label && <span className="text-small text-ds-fg-muted">{label}</span>}
          <DsCopyField wrap value={prompt.replaceAll("<site>", site)} aria-label={label ?? "Prompt for your AI"} />
        </div>
      ))}
      {children}
    </DsDisclosure>
  );
}

/**
 * One block on the settings page, on a `ds-surface-subtle` panel:
 * the H3 title, then one short muted line saying what it is or
 * runs on ("MongoDB Atlas", "Not published"), then, apart from that, the
 * `note` in the same muted text for the longer explanation, then its content,
 * and last, folded, its AI instructions (`ai`): every card says how to do its
 * job with your AI.
 * A card with nothing below its title has no body, so its padding stays even.
 * Settings-only layout, so it lives here rather than in Parabola.
 */
export function SettingsSection({
  id,
  title,
  description,
  note,
  ai,
  className,
  children,
}: {
  /** An anchor, e.g. "site" for /admin/settings#site. */
  id?: string;
  title: React.ReactNode;
  /** One short line under the title: what it is, or what it runs on. */
  description?: React.ReactNode;
  /** The longer explanation, first in the body. */
  note?: React.ReactNode;
  /** Prompts for your AI, folded at the foot of the card (AiInstructions). */
  ai?: AiPrompt[];
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="flex scroll-mt-5 flex-col gap-5 rounded-ds-lg bg-ds-surface-subtle p-5 text-ds-fg">
      <div className="flex flex-col gap-2">
        <h2 className="text-h3">{title}</h2>
        {description && <p className="text-p text-ds-fg-muted">{description}</p>}
      </div>
      {(note || children || ai) && (
        <div className={cn("flex flex-col gap-5", className)}>
          {note && <p className="text-p text-ds-fg-muted">{note}</p>}
          {children}
          {ai && <AiInstructions prompts={ai} />}
        </div>
      )}
    </section>
  );
}

/** A link out of the admin inside a card's text: in the text's own colour, underlined, with a small ↗. */
export function SettingsLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-0.5 underline underline-offset-4 hover:text-ds-fg"
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3.5 shrink-0 self-center" />
    </a>
  );
}
