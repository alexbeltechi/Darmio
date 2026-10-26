"use client";

/**
 * Sign in with your email and password, floating on the page like the
 * onboarding. A fresh install has no users yet, so this sends you to
 * /admin/setup. Too many wrong passwords lock the email for a while
 * (lib/db/login-attempts.ts); that message is shown as it comes.
 */

import { useEffect, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { DsButton, DsField, DsInput } from "@beltechi/parabola";
import { LOCKED_PREFIX } from "@/lib/cms/password";

const WRONG = "Wrong email or password";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
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
      const result = await signIn("credentials", { username: email, password, redirect: false, callbackUrl });

      if (result?.error) {
        setFormError(result.error.startsWith(LOCKED_PREFIX) ? result.error : WRONG);
        setLoading(false);
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setFormError("Couldn't sign in. Check NEXTAUTH_SECRET is set.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setFormError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  };

  const message = formError || (errorParam ? (errorParam === "CredentialsSignin" ? WRONG : "Couldn't sign in") : null);

  return (
    <div className="flex min-h-screen justify-center bg-ds-bg px-ds-20 py-ds-80 text-ds-fg">
      <form onSubmit={handleSubmit} className="flex w-full max-w-[440px] flex-col gap-ds-40">
        <h1 className="text-h2">Sign in</h1>

        <div className="flex flex-col gap-ds-20">
          <DsField label="Email">
            <DsInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
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
                type="button"
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
        </div>

        {message && (
          <p role="alert" className="text-p text-ds-error">
            {message}
          </p>
        )}

        <div>
          <DsButton type="submit" variant="primary" loading={loading}>
            Sign in
          </DsButton>
        </div>
      </form>
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
