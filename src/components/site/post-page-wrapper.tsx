"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface PostPageWrapperProps {
  children: React.ReactNode;
}

export function PostPageWrapper({ children }: PostPageWrapperProps) {
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // An open lightbox takes Escape itself; it should close back to the post, not leave it.
      if (e.key === "Escape" && !document.querySelector("[data-lightbox]")) {
        router.push("/");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return <>{children}</>;
}

