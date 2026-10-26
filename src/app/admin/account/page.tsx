"use client";

import { AdminMenuButton } from "@/components/admin/layout";
import { AccountSettings } from "@/components/admin/settings/account-settings";

/**
 * Your account, for the whole install rather than one project: your name,
 * your email and your password. Opened from the avatar at the foot of the
 * rail (decisions, 2026-10-26).
 */
export default function AccountPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="pointer-events-none sticky top-0 z-20 flex flex-col ds-nav-fade pb-5 [&>*]:pointer-events-auto">
        <div className="flex items-center gap-2 px-5 py-5">
          <h1 className="min-w-0 flex-1 truncate text-p text-ds-fg">Account</h1>
          <AdminMenuButton />
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 pb-5">
        <AccountSettings />
      </div>
    </div>
  );
}
