import { AuthShell } from "@/components/auth/auth-shell";
import { AuthMessage } from "@/components/auth/auth-message";

import { acceptInviteAction } from "@/lib/actions/auth";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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

  return (
    <AuthShell
      title="Accept your invite"
      description="Create your password to activate access to the internal operations workspace."
    >
      <AuthMessage error={params?.error} success={params?.success} />

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

        <Button type="submit" className="h-11 w-full rounded-2xl">
          Activate account
        </Button>
      </form>
    </AuthShell>
  );
}
