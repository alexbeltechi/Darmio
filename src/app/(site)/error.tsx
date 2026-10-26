"use client";

import { DsButton } from "@beltechi/parabola";

/**
 * When a page of the site can't load (most often: the install can't reach
 * its database yet). Visitors get a calm line and a retry; the owner finds
 * the exact problem by opening the admin, which says what's wrong.
 */
export default function SiteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-ds-16 px-ds-20 text-center">
      <p className="text-p text-ds-fg-muted">This page couldn&apos;t load right now.</p>
      <div className="flex flex-wrap justify-center gap-ds-8">
        <DsButton onClick={reset}>Try again</DsButton>
        <DsButton href="/admin" variant="text">
          I own this site
        </DsButton>
      </div>
    </main>
  );
}
