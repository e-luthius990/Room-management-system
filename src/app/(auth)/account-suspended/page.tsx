import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export default function AccountSuspendedPage() {
  return (
    <AuthShell
      title="Account suspended"
      description="This account cannot access the internal room operations system right now."
    >
      <div
        role="alert"
        className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
      >
        Contact your system administrator or camp manager for assistance.
      </div>

      <div className="mt-5">
        <Link
          href={AUTH_ROUTES.login}
          className="text-sm text-neutral-300 transition hover:text-white"
        >
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
