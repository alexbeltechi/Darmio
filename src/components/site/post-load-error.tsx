"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { DsButton } from "@beltechi/parabola";

/**
 * What a post shows when it can't load (almost always a database connection
 * that dropped for a moment): a plain message, Try again, and a way out.
 * Without it the failure is a blank page and a click that seems to do nothing.
 */
export function PostLoadError({ reset, onClose }: { reset: () => void; onClose: () => void }) {
  const router = useRouter();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 text-center">
      <div className="flex max-w-[420px] flex-col gap-2">
        <h1 className="text-h2 text-ds-fg">Couldn&apos;t load this post</h1>
        <p className="text-p text-ds-fg-muted">The connection dropped for a moment. Give it another try.</p>
      </div>
      <div className="flex gap-2">
        <DsButton
          variant="primary"
          onClick={() =>
            startTransition(() => {
              router.refresh();
              reset();
            })
          }
        >
          Try again
        </DsButton>
        <DsButton onClick={onClose}>Close</DsButton>
      </div>
    </div>
  );
}
