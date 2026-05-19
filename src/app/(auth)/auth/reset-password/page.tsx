import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/auth-message";

import { resetPasswordAction } from "@/lib/actions/auth";
import { AUTH_ROUTES } from "@/lib/auth/routes";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;

  if (params?.success) {
    return (
      <AuthShell
        title="Password updated"
        description="Your password has been updated successfully. You can now sign in with your new password."
      >
        <AuthMessage success={params.success} />

        <Link href={AUTH_ROUTES.login}>
          <Button type="button" className="h-11 w-full rounded-2xl">
            Back to sign in
          </Button>
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create a new password"
      description="Use a secure password to protect access to camp and room operations."
    >
      <AuthMessage error={params?.error} />

      <form action={resetPasswordAction} className="space-y-5">
        <Input
          id="password"
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          required
          placeholder="Create a strong password"
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          label="Confirm password"
          autoComplete="new-password"
          required
          placeholder="Confirm your password"
        />

        <PendingSubmitButton
          pendingLabel="Updating password..."
          fullWidth
          className="h-11 rounded-2xl"
        >
          Update password
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
