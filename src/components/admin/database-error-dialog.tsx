/**
 * Database Error Dialog
 * 
 * Shows user-friendly error when database connection fails
 */

"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { DsButton, DsDialog, DsDialogActions } from "@beltechi/parabola";

interface DatabaseErrorDialogProps {
  error: string | null;
  onClose?: () => void;
}

export function DatabaseErrorDialog({ error, onClose }: DatabaseErrorDialogProps) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"checking" | "healthy" | "unhealthy" | null>(null);

  useEffect(() => {
    if (error) {
      setOpen(true);
    }
  }, [error]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const checkStatus = async () => {
    setChecking(true);
    setStatus("checking");
    
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      
      if (data.status === "healthy") {
        setStatus("healthy");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setStatus("unhealthy");
      }
    } catch {
      setStatus("unhealthy");
    } finally {
      setChecking(false);
    }
  };

  const getErrorDetails = (error: string) => {
    if (error.startsWith("Network error")) {
      return {
        title: "Can't Reach the Server",
        message: "The request didn't get through",
        suggestion: "Check your connection, or that the dev server is still running. This often clears on its own, so try again.",
      };
    }
    if (error.includes("ENOTFOUND") || error.includes("querySrv")) {
      return {
        title: "DNS Resolution Failed",
        message: "MongoDB cluster DNS is still propagating",
        suggestion: "This is normal for new clusters. Usually takes 30-60 minutes.",
      };
    }
    if (error.includes("Authentication failed")) {
      return {
        title: "Authentication Failed",
        message: "MongoDB credentials are incorrect",
        suggestion: "Check your username and password in the connection string.",
      };
    }
    if (error.includes("timed out")) {
      return {
        title: "Connection Timeout",
        message: "Could not reach MongoDB server",
        suggestion: "Check your network connection and MongoDB Atlas firewall rules.",
      };
    }
    return {
      title: "Database Connection Failed",
      message: "Unable to connect to MongoDB",
      suggestion: "Check your configuration and try again.",
    };
  };

  if (!error) return null;

  const details = getErrorDetails(error);
  // A dropped connection says nothing about the database, so its checklist and Atlas link stay out.
  const isNetworkError = error.startsWith("Network error");

  return (
    <DsDialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : handleClose())}
      title={details.title}
      description={`${details.message}. ${details.suggestion}`}
      className="w-[min(560px,calc(100vw-32px))]"
    >
      {!isNetworkError && (
      <div className="flex flex-col gap-3 rounded-ds-lg bg-ds-surface-subtle p-4">
        <p className="text-p text-ds-fg">Common causes:</p>
        <ul className="flex flex-col gap-2 text-small text-ds-fg-muted [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0">
          <li className="flex items-start gap-2">
            <Clock aria-hidden />
            <span>MongoDB cluster DNS still propagating (wait 30-60 min for new clusters)</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle aria-hidden />
            <span>MONGODB_URI not configured correctly in .env.local</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertCircle aria-hidden />
            <span>Network firewall or IP not whitelisted in MongoDB Atlas</span>
          </li>
        </ul>
      </div>
      )}

      <div className="flex flex-col gap-2 rounded-ds-lg bg-ds-surface-subtle p-4">
        <p className="text-small text-ds-fg">Technical details:</p>
        <code className="block overflow-x-auto text-small text-ds-fg-muted">{error}</code>
      </div>

      {status && (
        <div
          role="status"
          className={`flex items-center gap-3 text-p [&_svg]:size-5 ${status === "unhealthy" ? "text-ds-error" : "text-ds-fg"}`}
        >
          {status === "healthy" ? (
            <>
              <CheckCircle2 aria-hidden />
              <span>Database connected! Reloading...</span>
            </>
          ) : status === "checking" ? (
            <>
              <Clock aria-hidden className="animate-spin" />
              <span>Checking connection...</span>
            </>
          ) : (
            <>
              <AlertCircle aria-hidden />
              <span>Still unavailable. Try again in a few minutes.</span>
            </>
          )}
        </div>
      )}

      <DsDialogActions>
        <DsButton variant="primary" onClick={checkStatus} loading={checking}>
          {checking ? "Checking..." : "Check Status"}
        </DsButton>
        {!isNetworkError && (
          <DsButton iconRight={ExternalLink} onClick={() => window.open("https://cloud.mongodb.com", "_blank")}>
            MongoDB Atlas
          </DsButton>
        )}
        <DsButton onClick={handleClose}>Close</DsButton>
      </DsDialogActions>
    </DsDialog>
  );
}
