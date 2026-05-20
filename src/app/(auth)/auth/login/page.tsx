"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/auth-message";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";
import { Input } from "@/components/ui/Input";

type LoginRouteResponse =
  | {
      ok: true;
      redirectTo: string;
    }
  | {
      ok: false;
      error: string;
    };

const BLOCKED_NEXT_PREFIXES = ["/auth/", "/api/", "/_next/"] as const;

function getSafeNextPath(value: string | null): string | null {
  const nextPath = value?.trim();

  if (!nextPath || nextPath === "/") {
    return null;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  if (nextPath.includes("\\")) {
    return null;
  }

  if (BLOCKED_NEXT_PREFIXES.some((prefix) => nextPath.startsWith(prefix))) {
    return null;
  }

  return nextPath;
}

function getInitialSearchParams(): URLSearchParams {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

export default function LoginPage(): React.JSX.Element {
  const initialParams = useMemo(() => getInitialSearchParams(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | undefined>(
    initialParams.get("error") ?? undefined,
  );

  const [success] = useState<string | undefined>(
    initialParams.get("success") ?? undefined,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const nextPath = useMemo(
    () => getSafeNextPath(initialParams.get("next")),
    [initialParams],
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("invalid_input");
      return;
    }

    setError(undefined);
    setIsSubmitting(true);

    try {
      const response = await fetch(AUTH_ROUTES.callback, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          next: nextPath ?? SYSTEM_ROUTES.dashboard,
        }),
      });

      const result = (await response.json()) as LoginRouteResponse;

      if (!response.ok || !result.ok) {
        setError(result.ok ? "invalid_credentials" : result.error);
        setIsSubmitting(false);
        return;
      }

      window.location.replace(result.redirectTo);
    } catch {
      setError("invalid_credentials");
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      description="Access your assigned camp operations workspace."
    >
      <AuthMessage error={error} success={success} />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          placeholder="name@company.com"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          disabled={isSubmitting}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Password
            </label>

            <Link
              href={AUTH_ROUTES.forgotPassword}
              className="text-xs font-medium text-muted transition hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>

          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary h-11 w-full rounded-2xl disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
