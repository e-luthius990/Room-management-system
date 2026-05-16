import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/auth-message";
import { AuthMessageCleaner } from "@/components/auth/auth-message-cleaner";

import { signInAction } from "@/lib/actions/auth";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    next?: string;
  }>;
};

function getSafeNextPath(value: string | undefined): string {
  if (!value) {
    return SYSTEM_ROUTES.dashboard;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return SYSTEM_ROUTES.dashboard;
  }

  if (value.startsWith("/auth/")) {
    return SYSTEM_ROUTES.dashboard;
  }

  return value;
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
      <AuthMessageCleaner />

      <AuthMessage error={params?.error} success={params?.success} />

      <form action={signInAction} className="space-y-5">
        <input type="hidden" name="next" value={nextPath} />

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

        <Button type="submit" className="h-11 w-full rounded-2xl">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
