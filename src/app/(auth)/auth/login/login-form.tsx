"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/auth-message";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type LoginFormProps = {
  initialError?: string;
  initialSuccess?: string;
  initialNext?: string;
};

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

function getSafeNextPath(value: string | null | undefined): string | null {
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

function getLoginErrorMessage(error: string | undefined): string | undefined {
  if (!error) {
    return undefined;
  }

  const messages: Record<string, string> = {
    invalid_input: "Enter your email address and password.",
    invalid_credentials: "The email or password is incorrect.",
    account_disabled: "This account is disabled. Contact an administrator.",
    account_suspended: "This account is suspended. Contact an administrator.",
    pending_password_reset:
      "This account requires a password reset before signing in.",
    access_denied: "You do not have access to this system.",
    session_failed: "The session could not be created. Try signing in again.",
  };

  return messages[error] ?? "Sign in failed. Check your details and try again.";
}

function shouldClearErrorOnEdit(error: string | undefined): boolean {
  return error === "invalid_input" || error === "invalid_credentials";
}

export function LoginForm({
  initialError,
  initialSuccess,
  initialNext,
}: LoginFormProps): React.JSX.Element {
  const router = useRouter();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | undefined>(initialError);
  const [success] = useState<string | undefined>(initialSuccess);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const nextPath = useMemo(() => getSafeNextPath(initialNext), [initialNext]);

  const visibleError = getLoginErrorMessage(error);
  const credentialsInvalid =
    error === "invalid_input" || error === "invalid_credentials";

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

    abortControllerRef.current?.abort();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setError(undefined);
    setIsSubmitting(true);

    try {
      const response = await fetch(AUTH_ROUTES.callback, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          next: nextPath,
        }),
      });

      const result = (await response
        .json()
        .catch(() => null)) as LoginRouteResponse | null;

      if (!response.ok || !result) {
        setError("invalid_credentials");
        setIsSubmitting(false);
        return;
      }

      if (!result.ok) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      router.replace(result.redirectTo);
    } catch (caughtError) {
      if (
        caughtError instanceof DOMException &&
        caughtError.name === "AbortError"
      ) {
        return;
      }

      setError("invalid_credentials");
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      description="Access your assigned camp operations workspace."
    >
      <div className="space-y-5">
        <AuthMessage error={visibleError} success={success} />

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email address"
            autoComplete="email"
            required
            placeholder="name@company.com"
            value={email}
            onChange={(event) => {
              setEmail(event.currentTarget.value);

              if (shouldClearErrorOnEdit(error)) {
                setError(undefined);
              }
            }}
            disabled={isSubmitting}
            invalid={credentialsInvalid}
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
                className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>

            <div className="relative">
              <Input
                wrapperClassName="space-y-0"
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(event) => {
                  setPassword(event.currentTarget.value);

                  if (shouldClearErrorOnEdit(error)) {
                    setError(undefined);
                  }
                }}
                disabled={isSubmitting}
                invalid={credentialsInvalid}
                className="pr-12"
              />

              <button
                type="button"
                className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center border border-transparent text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setShowPassword((current) => !current)}
                disabled={isSubmitting || password.length === 0}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-1">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              loadingText="Signing in"
              disabled={isSubmitting}
            >
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </AuthShell>
  );
}
