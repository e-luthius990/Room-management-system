import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { inviteUserAction } from "@/lib/actions/admin/invite-user";
import {
  getCampOptions,
  getInviteRoleOptions,
} from "@/lib/queries/admin-users";
import {
  CAMP_ACCESS_LEVEL_LABELS,
  CAMP_ACCESS_LEVELS,
  DEFAULT_ROLE_CAMP_ACCESS_LEVEL,
  SYSTEM_ROLE_LABELS,
  isCampScopedRoleKey,
  type InvitableRoleKey,
  type RoleKey,
} from "@/lib/auth/types";

type InviteUserPageSearchParams = {
  error?: string | string[];
  success?: string | string[];
};

type InviteUserPageProps = {
  searchParams?:
    | Promise<InviteUserPageSearchParams>
    | InviteUserPageSearchParams;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getErrorMessage(error: string | null): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the invite details and try again.",
    forbidden: "You do not have access to invite users.",
    role_not_allowed: "You are not allowed to assign that role.",
    role_not_found: "The selected role is not available for system access.",
    camp_required: "Select a camp for this role.",
    camp_not_found: "Selected camp was not found or is no longer active.",
    camp_not_allowed: "You cannot assign access to that camp.",
    user_exists: "A user with this email already exists.",
    access_denied: "You do not have access to perform this action.",
    invite_failed: "User invite could not be sent.",
    system_role_cannot_have_camp:
      "System Admin users must not be assigned to a camp.",
    system_role_cannot_have_access_level:
      "System Admin users must not have a camp access level.",
  };

  return messages[error] ?? decodeURIComponent(error);
}

function getSuccessMessage(success: string | null): string | null {
  if (!success) {
    return null;
  }

  const messages: Record<string, string> = {
    user_invited:
      "Invite sent successfully. The profile, role, and camp access were created.",
  };

  return messages[success] ?? decodeURIComponent(success);
}

function canInviteFromPage(roleKey: RoleKey): boolean {
  return roleKey === "super_admin" || roleKey === "system_admin";
}

function roleDescription(roleKey: InvitableRoleKey): string {
  switch (roleKey) {
    case "system_admin":
      return "Global system access. No camp access row will be created.";

    case "camp_manager":
      return "Camp-level management access for rooms, stays, guests, and operational oversight.";

    case "receptionist":
      return "Reception workflow access for reservations, allocations, check-in, and check-out.";

    case "security":
      return "Gate workflow access for clearance, entry, exit, and reception handoff.";

    case "executive_viewer":
      return "Read-only executive visibility into operational activity and summaries.";

    default:
      return "System access role.";
  }
}

function roleAccessSummary(roleKey: InvitableRoleKey): string {
  if (!isCampScopedRoleKey(roleKey)) {
    return "Global access";
  }

  const level = DEFAULT_ROLE_CAMP_ACCESS_LEVEL[roleKey];

  return `Default camp level: ${CAMP_ACCESS_LEVEL_LABELS[level]}`;
}

export default async function InviteUserPage({
  searchParams,
}: InviteUserPageProps): Promise<React.JSX.Element> {
  const currentUser = await requirePermission("users.invite");

  if (!canInviteFromPage(currentUser.role.key)) {
    redirect("/access-denied");
  }

  const params = await Promise.resolve(searchParams ?? {});
  const errorMessage = getErrorMessage(firstParam(params.error));
  const successMessage = getSuccessMessage(firstParam(params.success));

  const [roles, camps] = await Promise.all([
    getInviteRoleOptions(currentUser.role.key),
    getCampOptions(),
  ]);

  if (roles.length === 0) {
    redirect("/access-denied");
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Invite user"
        description="Send a secure Supabase invite and assign the user profile, role, and camp access using the application database contract."
        actions={
          <Link
            href="/admin/users"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
          >
            Back to users
          </Link>
        }
      />

      {(errorMessage || successMessage) && (
        <section className="grid gap-3">
          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form
          action={inviteUserAction}
          className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="invite-full-name"
                className="mb-2 block text-sm font-semibold text-neutral-800"
              >
                Full name <span className="text-red-600">*</span>
              </label>

              <input
                id="invite-full-name"
                required
                name="fullName"
                autoComplete="name"
                minLength={2}
                maxLength={120}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Staff full name"
              />
            </div>

            <div>
              <label
                htmlFor="invite-email"
                className="mb-2 block text-sm font-semibold text-neutral-800"
              >
                Email <span className="text-red-600">*</span>
              </label>

              <input
                id="invite-email"
                required
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label
                htmlFor="invite-phone"
                className="mb-2 block text-sm font-semibold text-neutral-800"
              >
                Phone
              </label>

              <input
                id="invite-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                maxLength={32}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="+256..."
              />
            </div>

            <div>
              <label
                htmlFor="invite-department"
                className="mb-2 block text-sm font-semibold text-neutral-800"
              >
                Department
              </label>

              <input
                id="invite-department"
                name="department"
                autoComplete="organization"
                maxLength={120}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Reception, Security, Operations..."
              />
            </div>

            <div>
              <label
                htmlFor="invite-job-title"
                className="mb-2 block text-sm font-semibold text-neutral-800"
              >
                Job title
              </label>

              <input
                id="invite-job-title"
                name="jobTitle"
                autoComplete="organization-title"
                maxLength={120}
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Camp Manager, Receptionist..."
              />
            </div>
          </div>

          <div className="mt-8 border-b border-neutral-100 pb-5">
            <p className="text-sm font-semibold text-neutral-950">
              Role and access
            </p>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              System Admin users are global. Camp roles require one active camp.
              The server action enforces the final access level.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="invite-role-key"
                className="mb-2 block text-sm font-semibold text-neutral-800"
              >
                Role <span className="text-red-600">*</span>
              </label>

              <select
                id="invite-role-key"
                required
                name="roleKey"
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                defaultValue=""
              >
                <option value="" disabled>
                  Select role
                </option>

                {roles.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.name}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-neutral-500">
                Super Admin can invite System Admin and camp roles. System Admin
                can invite camp roles only.
              </p>
            </div>

            <div>
              <label
                htmlFor="invite-camp-id"
                className="mb-2 block text-sm font-semibold text-neutral-800"
              >
                Camp
              </label>

              <select
                id="invite-camp-id"
                name="campId"
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                defaultValue=""
              >
                <option value="">No camp for System Admin</option>

                {camps.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name} ({camp.code})
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-neutral-500">
                Required for camp manager, receptionist, security, and executive
                viewer.
              </p>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="invite-access-level"
                className="mb-2 block text-sm font-semibold text-neutral-800"
              >
                Access level override
              </label>

              <select
                id="invite-access-level"
                name="accessLevel"
                className="h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                defaultValue=""
              >
                <option value="">Use role minimum</option>

                {CAMP_ACCESS_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {CAMP_ACCESS_LEVEL_LABELS[level]}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs leading-5 text-neutral-500">
                The server will ignore this for system roles and will never save
                a level below the selected role minimum.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-neutral-100 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/admin/users"
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
            >
              Send invite
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-neutral-950">
              Available roles
            </p>

            <div className="mt-4 space-y-3">
              {roles.map((role) => {
                const roleKey = role.key;
                const label = SYSTEM_ROLE_LABELS[roleKey] ?? role.name;

                return (
                  <div
                    key={role.key}
                    className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-neutral-950">
                        {label}
                      </p>
                      <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-600">
                        {roleAccessSummary(roleKey)}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-neutral-500">
                      {roleDescription(roleKey)}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-950">
              Database write path
            </p>

            <div className="mt-4 space-y-3 text-sm leading-6 text-blue-900">
              <p>
                <span className="font-semibold">1.</span> Supabase Auth invite
                is sent.
              </p>
              <p>
                <span className="font-semibold">2.</span>{" "}
                <code className="font-mono">profiles</code> gets{" "}
                <code className="font-mono">account_status = invited</code>.
              </p>
              <p>
                <span className="font-semibold">3.</span>{" "}
                <code className="font-mono">user_roles</code> receives the
                selected role.
              </p>
              <p>
                <span className="font-semibold">4.</span> Camp roles receive{" "}
                <code className="font-mono">user_camp_access</code>.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
