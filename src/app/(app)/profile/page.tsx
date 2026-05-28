import type { ReactNode } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";

import { AccountAvatar } from "@/components/account/account-avatar";
import { requireAuth } from "@/lib/auth/require-auth";
import { APP_ROUTES } from "@/lib/auth/routes";
import {
  ACCOUNT_STATUS_LABELS,
  CAMP_ACCESS_LEVEL_LABELS,
} from "@/lib/auth/types";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : "Not set";
}

function ProfileFact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}): React.JSX.Element {
  return (
    <div className="border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

export default async function ProfilePage(): Promise<React.JSX.Element> {
  noStore();

  const currentUser = await requireAuth();
  const { profile } = currentUser;
  const displayName = displayValue(profile.full_name);
  const displayProfileEmail = displayValue(profile.email);
  const displayEmail =
    displayProfileEmail !== "Not set"
      ? displayProfileEmail
      : displayValue(currentUser.authUser.email);

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 border-b border-border bg-surface px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Account profile</div>
            <div className="mt-3 flex min-w-0 items-center gap-4">
              <AccountAvatar
                name={displayName}
                photoUpdatedAt={profile.profile_photo_updated_at}
                size="lg"
              />

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-[-0.045em] text-foreground">
                  {displayName}
                </h1>
                <p className="mt-1 truncate text-sm text-muted">
                  {currentUser.role.name} &middot; {displayEmail}
                </p>
              </div>
            </div>
          </div>

          <Link href={APP_ROUTES.account.settings} className="btn-primary">
            Account settings
          </Link>
        </div>

        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-4 py-3 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              Status
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {ACCOUNT_STATUS_LABELS[profile.account_status]}
            </p>
          </div>
          <div className="px-4 py-3 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              Role
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {currentUser.role.name}
            </p>
          </div>
          <div className="px-4 py-3 sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              Last login
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatDateTime(profile.last_login_at)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <section className="surface-card overflow-hidden">
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-foreground">
                Contact details
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                Profile information used by operational workflows.
              </p>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
              <ProfileFact
                label="Email"
                value={displayEmail}
                icon={<Mail className="size-3.5" aria-hidden="true" />}
              />
              <ProfileFact
                label="Phone"
                value={displayValue(profile.phone)}
                icon={<Phone className="size-3.5" aria-hidden="true" />}
              />
              <ProfileFact
                label="Department"
                value={displayValue(profile.department)}
                icon={<Building2 className="size-3.5" aria-hidden="true" />}
              />
              <ProfileFact
                label="Job title"
                value={displayValue(profile.job_title)}
                icon={<UserRound className="size-3.5" aria-hidden="true" />}
              />
            </div>
          </section>

          <section className="surface-card overflow-hidden">
            <div className="border-b border-border px-4 py-4 sm:px-5">
              <h2 className="text-sm font-semibold text-foreground">
                Camp access
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                Camps and access levels currently assigned to this account.
              </p>
            </div>

            {currentUser.isSystemActor ? (
              <div className="p-4 sm:p-5">
                <div className="border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground">
                  System actor with all-camp access.
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {currentUser.campAccess.length > 0 ? (
                  currentUser.campAccess.map((access) => (
                    <div
                      key={access.id}
                      className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {access.camp_name}
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          {access.camp_code}
                        </div>
                      </div>
                      <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        {CAMP_ACCESS_LEVEL_LABELS[access.access_level]}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-muted sm:px-5">
                    No camp access assigned.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="surface-card overflow-hidden">
            <div className="border-b border-border px-4 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                Security posture
              </h2>
            </div>
            <div className="grid gap-3 p-4">
              <ProfileFact
                label="Password"
                value={
                  profile.force_password_change
                    ? "Change required"
                    : "No forced change"
                }
                icon={<KeyRound className="size-3.5" aria-hidden="true" />}
              />
              <ProfileFact
                label="Failed logins"
                value={String(profile.failed_login_count)}
                icon={<ShieldCheck className="size-3.5" aria-hidden="true" />}
              />
              <ProfileFact
                label="Created"
                value={formatDateTime(profile.created_at)}
                icon={
                  <CalendarClock className="size-3.5" aria-hidden="true" />
                }
              />
              <ProfileFact
                label="Updated"
                value={formatDateTime(profile.updated_at)}
                icon={<BadgeCheck className="size-3.5" aria-hidden="true" />}
              />
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
