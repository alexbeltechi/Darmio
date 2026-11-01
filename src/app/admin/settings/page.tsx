"use client";

import { DsTopBar } from "@beltechi/parabola";
import { AdminMenuButton } from "@/components/admin/layout";
import { SiteSettings } from "@/components/admin/settings/site-settings";
import { ExamplesSettings } from "@/components/admin/settings/examples-settings";
import { DesignSettings } from "@/components/admin/settings/design-settings";
import { LibrarySettings } from "@/components/admin/settings/library-settings";
import { IntegrationsSettings } from "@/components/admin/settings/integrations-settings";
import { AgentSettings } from "@/components/admin/settings/agent-settings";

/**
 * The current project's settings, one section per thing a project can vary,
 * in the order you'd set them up: the site, its library, the accounts it
 * works with, the agent's brain and rules. Your own account is at
 * /admin/account, for the whole install. Design, the project's Parabola
 * theme, follows the site, then its examples (an example site to remove,
 * shown while there is one to remove or add). Each section has an anchor
 * (`#site`, `#design`, `#examples`, `#library`, `#integrations`, `#agent`).
 */
export default function SettingsPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Pinned header, solid with a rule under it, like every admin page and /parabola (DsTopBar). */}
      <DsTopBar className="mb-5">
        <div className="flex items-center gap-2 px-5 py-3">
          <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">Settings</h1>
          <AdminMenuButton />
        </div>
      </DsTopBar>

      <div className="flex flex-col gap-5 px-5 pb-5">
        <SiteSettings />
        <DesignSettings />
        <ExamplesSettings />
        <LibrarySettings />
        <IntegrationsSettings />
        <AgentSettings />
      </div>
    </div>
  );
}
