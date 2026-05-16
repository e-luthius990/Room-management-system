import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/auth-message";

import { requestPasswordResetAction } from "@/lib/actions/auth";
import { AUTH_ROUTES } from "@/lib/auth/routes";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;

  return (
    <AuthShell
      title="Reset password"
      description="Enter your work email address to receive a secure password reset link."
    >
      <AuthMessage error={params?.error} success={params?.success} />

      <form action={requestPasswordResetAction} className="space-y-5">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          placeholder="name@company.com"
        />

        <Button type="submit" className="h-11 w-full rounded-2xl">
          Send reset link
        </Button>
      </form>

      <div className="mt-6 border-t border-border pt-5">
        <Link
          href={AUTH_ROUTES.login}
          className="text-sm font-medium text-muted transition hover:text-foreground"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
