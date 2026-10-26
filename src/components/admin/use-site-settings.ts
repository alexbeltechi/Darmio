"use client";

import * as React from "react";

/** Fired after a settings screen saves the site settings, so the shell refreshes. */
export const SITE_SETTINGS_CHANGED = "cms:site-settings-changed";
export const announceSiteSettingsChanged = () => window.dispatchEvent(new Event(SITE_SETTINGS_CHANGED));

/**
 * The site's name for the admin shell (the rail mark, the mobile menu):
 * null until it has loaded, refetched whenever a settings screen saves it.
 */
export function useSiteName(): string | null {
  const [name, setName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/admin/settings")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!cancelled && typeof json?.data?.siteName === "string") setName(json.data.siteName);
        })
        .catch(() => {});
    load();
    window.addEventListener(SITE_SETTINGS_CHANGED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(SITE_SETTINGS_CHANGED, load);
    };
  }, []);

  return name;
}
