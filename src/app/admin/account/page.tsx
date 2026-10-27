"use client";

import { AdminMenuButton } from "@/components/admin/layout";
import { AccountSettings } from "@/components/admin/settings/account-settings";
import { InstallSettings } from "@/components/admin/settings/install-settings";

/**
 * Home › Settings: what's the install's rather than one project's
 * (decisions, 2026-10-26 and 2026-10-27): you (name, email, password), then
 * what every project runs on (hosting, database, image storage) and how much
 * of it they use. Each project's own settings stay behind its gear.
 */
export default function AccountPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pointer-events-none sticky top-0 z-20 flex flex-col ds-nav-fade pb-5 [&>*]:pointer-events-auto">
        <div className="flex items-center gap-2 px-5 py-5">
          <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">Settings</h1>
          <AdminMenuButton />
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 pb-5">
        <AccountSettings />
        <InstallSettings />
      </div>
    </div>
  );
}
