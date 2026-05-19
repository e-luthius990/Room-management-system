import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/auth-message";

import { acceptInviteAction } from "@/lib/actions/auth";
import { AUTH_ROUTES } from "@/lib/auth/routes";

import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

type AcceptInvitePageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps): Promise<React.JSX.Element> {
  const params = await searchParams;

  if (params?.success) {
    return (
      <AuthShell
        title="Account activated"
        description="Your account has been activated successfully. You can now access your assigned workspace."
      >
        <AuthMessage success={params.success} />

        <Link
          href={AUTH_ROUTES.login}
          className="btn-primary h-11 w-full rounded-2xl"
        >
          Continue to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Accept your invite"
      description="Create your password to activate access to the internal operations workspace."
    >
      <AuthMessage error={params?.error} />

      <form action={acceptInviteAction} className="space-y-5">
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
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
          pendingLabel="Activating account..."
          fullWidth
          className="h-11 rounded-2xl"
        >
          Activate account
        </PendingSubmitButton>
      </form>

      {params?.error === "session_required" ? (
        <div className="mt-6 border-t border-border pt-5">
          <Link
            href={AUTH_ROUTES.login}
            className="text-sm font-medium text-muted transition hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      ) : null}
    </AuthShell>
  );
}
