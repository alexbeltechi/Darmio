"use client";

/**
 * Admin Login Page
 * 
 * Simple username/password login form.
 * A fresh install has no users yet, so this sends you to /admin/setup.
 */

import { useEffect, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { DsButton, DsField, DsInput } from "@beltechi/parabola";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const errorParam = searchParams.get("error");
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((json) => json.data?.needed && router.replace("/admin/setup"))
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setFormError("Invalid username or password");
        setLoading(false);
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setFormError("Sign in failed. Check NEXTAUTH_SECRET is set.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setFormError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-bg p-4 text-ds-fg">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-ds-lg bg-ds-surface-subtle p-5 ds-fields-fill">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-h3">Admin</h1>
          <p className="text-p text-ds-fg-muted">Sign in to access the dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Error messages */}
          {(formError || errorParam) && (
            <div role="alert" className="rounded-ds-md bg-ds-error/10 p-3 text-p text-ds-error">
              {formError || (errorParam === "CredentialsSignin" ? "Invalid username or password" : "Authentication error")}
            </div>
          )}

          <DsField label="Username">
            <DsInput
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              disabled={loading}
            />
          </DsField>

          <DsField label="Password">
            <div className="relative">
              <DsInput
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                className="pr-10"
              />
              <DsButton
                variant="text"
                size="small"
                iconLeft={showPassword ? EyeOff : Eye}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              />
            </div>
          </DsField>

          <DsButton type="submit" variant="primary" className="w-full" loading={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </DsButton>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-ds-bg p-4">
          <Loader2 aria-hidden className="size-5 animate-spin text-ds-fg-muted" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
