import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { AUTH_ROUTES } from "@/lib/auth/routes";

export default function AccessDeniedPage(): React.JSX.Element {
  return (
    <AuthShell
      title="Access denied"
      description="Your account does not have permission to open that area."
    >
      <div
        role="alert"
        className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
      >
        Contact your system administrator if you believe this access should be
        assigned to your role.
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
