import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/auth-message";

import { requestPasswordResetAction } from "@/lib/actions/auth";
import { AUTH_ROUTES } from "@/lib/auth/routes";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

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

  if (params?.success) {
    return (
      <AuthShell
        title="Check your email"
        description="If the email address is linked to an account, a secure password reset link has been sent."
      >
        <AuthMessage success={params.success} />

        <div className="space-y-4">
          <Link href={AUTH_ROUTES.login}>
            <Button type="button" className="h-11 w-full rounded-2xl">
              Back to sign in
            </Button>
          </Link>

          <p className="text-center text-xs leading-5 text-muted">
            For security, we do not reveal whether an email address exists in
            the system.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset password"
      description="Enter your work email address to receive a secure password reset link."
    >
      <AuthMessage error={params?.error} />

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

        <PendingSubmitButton
          pendingLabel="Sending reset link..."
          fullWidth
          className="h-11 rounded-2xl"
        >
          Send reset link
        </PendingSubmitButton>
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
