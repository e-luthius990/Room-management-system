import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export default function AccessPendingPage() {
  return (
    <AuthShell
      title="Access pending"
      description="Your account exists, but access has not been fully assigned yet."
    >
      <div
        role="status"
        className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100"
      >
        Contact your system administrator to confirm your role and camp access.
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
