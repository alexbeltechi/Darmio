"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Settings, UserRound } from "lucide-react";
import {
  DsDropdown,
  DsDropdownContent,
  DsDropdownItem,
  DsDropdownLabel,
  DsDropdownSeparator,
  DsDropdownTrigger,
} from "@beltechi/parabola";
import { cn } from "@/lib/utils";
import { siteInitial } from "@/lib/cms/site";
import { HOME_SETTINGS_PATH } from "@/components/admin/home/home-routes";

type Me = { name?: string; email: string };

/** Who's signed in, for the account menu's avatar and label. */
function useMe(): Me | null {
  const [me, setMe] = React.useState<Me | null>(null);
  React.useEffect(() => {
    fetch("/api/admin/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data && setMe(json.data))
      .catch(() => {});
  }, []);
  return me;
}

/**
 * You, at the foot of the admin's rail and of Home's sidebar (decisions,
 * 2026-10-26): a round avatar with your initial (and your email beside it,
 * with `withEmail`) that opens your email, Account settings (Home ›
 * Settings, the install's, not a project's) and Sign out.
 */
export function AccountMenu({
  align = "end",
  side = "right",
  withEmail = false,
}: {
  align?: "start" | "end";
  side?: "right" | "bottom" | "top";
  withEmail?: boolean;
}) {
  const router = useRouter();
  const me = useMe();
  const initial = me ? siteInitial(me.name || me.email) : "";

  return (
    <DsDropdown modal={false}>
      <DsDropdownTrigger asChild>
        <button
          type="button"
          aria-label="Your account"
          title={me?.email}
          className={cn(
            "flex min-w-0 shrink-0 items-center gap-2 rounded-full text-p text-ds-fg ds-focus",
            withEmail && "flex-1 pr-3 hover:bg-ds-surface/70"
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ds-surface">
            {initial || <UserRound aria-hidden className="size-4" />}
          </span>
          {withEmail && <span className="min-w-0 truncate text-small text-ds-fg-muted">{me?.email}</span>}
        </button>
      </DsDropdownTrigger>
      <DsDropdownContent side={side} align={align} sideOffset={8} className="min-w-56">
        {me && <DsDropdownLabel className="truncate">{me.email}</DsDropdownLabel>}
        <DsDropdownItem iconLeft={Settings} onSelect={() => router.push(HOME_SETTINGS_PATH)}>
          Account settings
        </DsDropdownItem>
        <DsDropdownSeparator />
        <DsDropdownItem iconLeft={LogOut} onSelect={() => signOut({ callbackUrl: "/admin/login" })}>
          Sign out
        </DsDropdownItem>
      </DsDropdownContent>
    </DsDropdown>
  );
}
