import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/auth-message";
import { signInAction } from "@/lib/actions/auth";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

type LoginSearchParams = {
  error?: string;
  success?: string;
  next?: string;
};

type LoginPageProps = {
  searchParams?: Promise<LoginSearchParams>;
};

const BLOCKED_NEXT_PREFIXES = ["/auth/", "/api/", "/_next/"] as const;

function getSafeNextPath(value: string | undefined): string | null {
  const nextPath = value?.trim();

  if (!nextPath) {
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

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const nextPath = getSafeNextPath(params?.next);

  return (
    <AuthShell
      title="Sign in"
      description="Access your assigned camp operations workspace."
    >
      <AuthMessage error={params?.error} success={params?.success} />

      <form action={signInAction} className="space-y-5">
        {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          placeholder="name@company.com"
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
          />
        </div>

        <PendingSubmitButton
          pendingLabel="Signing in..."
          fullWidth
          className="h-11 rounded-2xl"
        >
          Sign in
        </PendingSubmitButton>
      </form>
    </AuthShell>
  );
}
