"use client";

import { AdminMenuButton } from "@/components/admin/layout";
import { SiteSettings } from "@/components/admin/settings/site-settings";
import { DesignSettings } from "@/components/admin/settings/design-settings";
import { LibrarySettings } from "@/components/admin/settings/library-settings";
import { IntegrationsSettings } from "@/components/admin/settings/integrations-settings";
import { AgentSettings } from "@/components/admin/settings/agent-settings";

/**
 * The current project's settings, one section per thing a project can vary,
 * in the order you'd set them up: the site, its library, the accounts it
 * works with, the agent's brain and rules (decisions, 2026-10-24). Your own
 * account is at /admin/account, for the whole install (decisions,
 * 2026-10-26). Design, the project's Parabola theme, follows the site
 * (decisions, 2026-10-28). Each section has an anchor (`#site`, `#design`, `#library`,
 * `#integrations`, `#agent`).
 */
export default function SettingsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Pinned header: the content fades out beneath it (`ds-nav-fade`), and clicks
          pass through the gradient's empty space, like the other admin pages. */}
      <div className="pointer-events-none sticky top-0 z-20 flex flex-col ds-nav-fade pb-5 [&>*]:pointer-events-auto">
        <div className="flex items-center gap-2 px-5 py-5">
          <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">Settings</h1>
          <AdminMenuButton />
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 pb-5">
        <SiteSettings />
        <DesignSettings />
        <LibrarySettings />
        <IntegrationsSettings />
        <AgentSettings />
      </div>
    </div>
  );
}
