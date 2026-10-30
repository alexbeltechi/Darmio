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
import { siteInitial } from "@/lib/cms/site";
import { ACCOUNT_PATH } from "@/components/admin/home/home-routes";

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
 * You, at the foot of a project's rail: a round
 * avatar with your initial that opens your email, Settings (yours, for the
 * install, not a project's) and Sign out. Home's sidebar lists the same as items.
 */
export function AccountMenu({ align = "end", side = "right" }: { align?: "start" | "end"; side?: "right" | "bottom" }) {
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
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ds-surface text-p text-ds-fg ds-focus"
        >
          {initial || <UserRound aria-hidden className="size-4" />}
        </button>
      </DsDropdownTrigger>
      <DsDropdownContent side={side} align={align} sideOffset={8} className="min-w-56">
        {me && <DsDropdownLabel className="truncate">{me.email}</DsDropdownLabel>}
        <DsDropdownItem iconLeft={Settings} onSelect={() => router.push(ACCOUNT_PATH)}>
          Settings
        </DsDropdownItem>
        <DsDropdownSeparator />
        <DsDropdownItem iconLeft={LogOut} onSelect={() => signOut({ callbackUrl: "/admin/login" })}>
          Sign out
        </DsDropdownItem>
      </DsDropdownContent>
    </DsDropdown>
  );
}
