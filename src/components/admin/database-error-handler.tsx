/**
 * Shows a dialog when an admin request fails because the database is
 * unreachable (API errors with a DB_* code, see lib/api/error-handler).
 * It does this by wrapping window.fetch, because admin screens call fetch
 * directly; a shared admin fetch helper should replace this (roadmap).
 */

"use client";

import { useEffect, useState } from "react";
import { DatabaseErrorDialog } from "./database-error-dialog";

export function DatabaseErrorHandler({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
          const clone = response.clone();
          try {
            const data = await clone.json();
            
            if (data.code && data.code.startsWith("DB_")) {
              setError(data.error + "\n\n" + (data.message || ""));
            }
          } catch {
            // Not JSON or couldn't parse
          }
        }
        
        return response;
      } catch (err) {
        if (err instanceof Error) {
          if (err.message.includes("Failed to fetch")) {
            setError("Network error: Could not reach the server. Check your connection.");
          }
        }
        throw err;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <>
      {children}
      <DatabaseErrorDialog error={error} onClose={() => setError(null)} />
    </>
  );
}

