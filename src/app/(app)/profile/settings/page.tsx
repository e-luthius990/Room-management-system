import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { KeyRound, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

import { updateOwnProfileAction } from "@/lib/actions/account/update-profile";
import { AccountProfilePhotoField } from "@/components/account/account-profile-photo-field";
import { requireAuth } from "@/lib/auth/require-auth";
import { APP_ROUTES, AUTH_ROUTES } from "@/lib/auth/routes";
import {
  ACCOUNT_STATUS_LABELS,
  CAMP_ACCESS_LEVEL_LABELS,
} from "@/lib/auth/types";
import { Input } from "@/components/ui/Input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

type AccountSettingsPageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

type PageSearchParams = {
  error?: string | string[];
  success?: string | string[];
};

function getFirstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error?: string): string | null {
  const messages: Record<string, string> = {
    invalid_profile: "Check the profile fields and try again.",
    profile_photo_too_large: "Profile picture must be 4 MB or smaller.",
    profile_photo_upload_failed: "Profile picture could not be uploaded.",
    unsupported_profile_photo_type: "Use a JPG, PNG, or WebP profile picture.",
    update_failed: "Profile settings could not be saved.",
  };

  return error
    ? (messages[error] ?? "The request could not be completed.")
    : null;
}

function getSuccessMessage(success?: string): string | null {
  const messages: Record<string, string> = {
    profile_updated: "Profile settings saved.",
  };

  return success ? (messages[success] ?? null) : null;
}

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : "Not set";
}

export default async function AccountSettingsPage({
  searchParams,
}: AccountSettingsPageProps): Promise<React.JSX.Element> {
  noStore();

  const currentUser = await requireAuth();
  const query = searchParams ? await searchParams : undefined;
  const errorMessage = getErrorMessage(getFirstParam(query?.error));
  const successMessage = getSuccessMessage(getFirstParam(query?.success));
  const { profile } = currentUser;
  const email = displayValue(profile.email ?? currentUser.authUser.email);

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 border-b border-border bg-surface px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Account settings</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground">
              Profile and security
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
              Maintain your visible operational profile. Access, role, and
              email changes are controlled by administrators.
            </p>
          </div>

          <Link href={APP_ROUTES.account.profile} className="btn-secondary">
            View profile
          </Link>
        </div>
      </section>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <form
          action={updateOwnProfileAction}
          className="surface-card overflow-hidden"
        >
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <UserRound aria-hidden="true" className="size-4 text-muted" />
              <h2 className="text-sm font-semibold text-foreground">
                Personal details
              </h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              These fields appear in navigation, notifications, and operational
              assignments.
            </p>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <AccountProfilePhotoField
              displayName={profile.full_name}
              photoUpdatedAt={profile.profile_photo_updated_at}
              className="sm:col-span-2"
            />

            <Input
              id="fullName"
              name="fullName"
              label="Full name"
              required
              minLength={2}
              maxLength={120}
              defaultValue={profile.full_name}
            />

            <Input
              id="email"
              label="Email"
              value={email}
              disabled
              hint="Email changes are managed by administrators."
            />

            <Input
              id="phone"
              name="phone"
              label="Phone"
              maxLength={40}
              defaultValue={profile.phone ?? ""}
              placeholder="+256..."
            />

            <Input
              id="department"
              name="department"
              label="Department"
              maxLength={120}
              defaultValue={profile.department ?? ""}
              placeholder="Reception, Security, Operations..."
            />

            <Input
              id="jobTitle"
              name="jobTitle"
              label="Job title"
              maxLength={120}
              defaultValue={profile.job_title ?? ""}
              placeholder="Receptionist, Camp manager..."
              wrapperClassName="sm:col-span-2"
            />
          </div>

          <div className="form-actions mx-4 mb-4 sm:mx-5">
            <PendingSubmitButton pendingLabel="Saving settings...">
              Save settings
            </PendingSubmitButton>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="surface-card overflow-hidden">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-4 text-muted"
                />
                <h2 className="text-sm font-semibold text-foreground">
                  Account access
                </h2>
              </div>
            </div>

            <dl className="divide-y divide-border text-sm">
              <div className="grid gap-1 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  Status
                </dt>
                <dd className="font-semibold text-foreground">
                  {ACCOUNT_STATUS_LABELS[profile.account_status]}
                </dd>
              </div>
              <div className="grid gap-1 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  Role
                </dt>
                <dd className="font-semibold text-foreground">
                  {currentUser.role.name}
                </dd>
              </div>
              <div className="grid gap-1 px-4 py-3">
                <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  Permissions
                </dt>
                <dd className="font-semibold text-foreground">
                  {currentUser.permissions.length}
                </dd>
              </div>
            </dl>
          </section>

          <section className="surface-card overflow-hidden">
            <div className="border-b border-border px-4 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                Camp access
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted">
                Current access is managed by administrators.
              </p>
            </div>

            {currentUser.isSystemActor ? (
              <div className="p-4 text-sm font-semibold text-foreground">
                System actor with all-camp access.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {currentUser.campAccess.length > 0 ? (
                  currentUser.campAccess.map((access) => (
                    <div key={access.id} className="px-4 py-3">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {access.camp_name}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{access.camp_code}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span>
                          {CAMP_ACCESS_LEVEL_LABELS[access.access_level]}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-muted">
                    No camp access assigned.
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="surface-card overflow-hidden">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-2">
                <LockKeyhole aria-hidden="true" className="size-4 text-muted" />
                <h2 className="text-sm font-semibold text-foreground">
                  Password
                </h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted">
                Use the secure password reset flow to change your password.
              </p>
            </div>

            <div className="p-4">
              <Link
                href={AUTH_ROUTES.forgotPassword}
                className="btn-secondary w-full"
              >
                <KeyRound aria-hidden="true" className="size-4" />
                Request password reset
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
