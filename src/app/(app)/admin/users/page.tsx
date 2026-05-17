import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import {
  getAdminUsers,
  type AdminUserListItem,
} from "@/lib/queries/admin-users";
import { DeleteInvitedUserButton } from "@/components/users/delete-invited-user-button";
import {
  ACCOUNT_STATUS_LABELS,
  SYSTEM_ROLE_LABELS,
  type AccountStatus,
} from "@/lib/auth/types";

type AdminUsersPageSearchParams = {
  error?: string | string[];
  success?: string | string[];
};

type AdminUsersPageProps = {
  searchParams?:
    | Promise<AdminUsersPageSearchParams>
    | AdminUsersPageSearchParams;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getSuccessMessage(success: string | null): string | null {
  if (!success) {
    return null;
  }

  const messages: Record<string, string> = {
    user_invited:
      "Invite sent successfully. The profile, role, and camp access records were created.",
    invited_user_deleted: "Invited user was permanently deleted.",
    user_disabled: "User account was disabled.",
    user_updated: "User details were updated.",
  };

  return messages[success] ?? decodeURIComponent(success);
}

function getErrorMessage(error: string | null): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the user details and try again.",
    forbidden: "You do not have access to manage users.",
    role_not_allowed: "You cannot assign that role.",
    role_not_found: "The selected role is not available for system access.",
    camp_required: "Select a camp for this role.",
    camp_not_found: "The selected camp is not active or no longer exists.",
    camp_not_allowed: "You do not have access to assign that camp.",
    user_exists: "A user with this email already exists.",
    access_denied: "You do not have access to perform this action.",
    invite_failed: "The invite could not be sent.",
    delete_failed: "The invited user could not be deleted.",
    self_delete_blocked: "You cannot delete your own account.",
    not_invited: "Only users with invited status can be permanently deleted.",
    system_role_cannot_have_camp:
      "System Admin users must not be assigned to a camp.",
    system_role_cannot_have_access_level:
      "System Admin users must not have a camp access level.",
  };

  return messages[error] ?? decodeURIComponent(error);
}

function accountStatusTone(status: AccountStatus): string {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "invited":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "suspended":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "disabled":
      return "border-red-200 bg-red-50 text-red-700";

    case "expired_invite":
      return "border-slate-200 bg-slate-100 text-slate-700";

    case "pending_password_reset":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

function formatAccountStatus(status: AccountStatus): string {
  return ACCOUNT_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function formatRoleLabel(user: AdminUserListItem): string {
  if (user.role_key && SYSTEM_ROLE_LABELS[user.role_key]) {
    return SYSTEM_ROLE_LABELS[user.role_key];
  }

  return user.role_name ?? "No role assigned";
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getInitials(name: string): string {
  const initials = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "U";
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps): Promise<React.JSX.Element> {
  const currentUser = await requirePermission("users.view");

  const [params, users] = await Promise.all([
    Promise.resolve(searchParams ?? {}),
    getAdminUsers(),
  ]);

  const successMessage = getSuccessMessage(firstParam(params.success));
  const errorMessage = getErrorMessage(firstParam(params.error));

  const canInviteUsers =
    currentUser.permissions.includes("users.invite") &&
    (currentUser.role.key === "super_admin" ||
      currentUser.role.key === "system_admin");

  const isSuperAdmin = currentUser.role.key === "super_admin";

  const activeCount = users.filter(
    (user) => user.account_status === "active",
  ).length;

  const invitedCount = users.filter(
    (user) => user.account_status === "invited",
  ).length;

  const restrictedCount = users.filter((user) =>
    ["suspended", "disabled", "expired_invite"].includes(user.account_status),
  ).length;

  return (
    <main className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage internal user profiles, Supabase invite status, role assignment, and camp-scoped access."
        actions={
          canInviteUsers ? (
            <Link
              href="/admin/users/invite"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-neutral-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
            >
              Invite user
            </Link>
          ) : null
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

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Active users</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {activeCount}
          </p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Profiles currently allowed to access the system.
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">
            Pending invites
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {invitedCount}
          </p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Auth invites waiting for user acceptance.
          </p>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">
            Restricted accounts
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950">
            {restrictedCount}
          </p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Suspended, disabled, or expired invite records.
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-neutral-200 bg-neutral-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-950">
              System user registry
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Source of truth: profiles, user_roles, roles, and
              user_camp_access.
            </p>
          </div>

          <div className="text-xs font-medium text-neutral-500">
            {users.length} {users.length === 1 ? "record" : "records"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-white text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Camp access</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {users.map((user) => {
                const canDeleteInvitedUser =
                  isSuperAdmin &&
                  currentUser.profile.id !== user.id &&
                  user.account_status === "invited";

                return (
                  <tr
                    key={user.id}
                    className="align-top transition hover:bg-neutral-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-xs font-semibold text-white">
                          {getInitials(user.full_name)}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-neutral-950">
                            {user.full_name}
                          </div>

                          <div className="mt-1 truncate text-xs text-neutral-500">
                            {user.email ?? "No email"}
                          </div>

                          {user.phone && (
                            <div className="mt-1 text-xs text-neutral-500">
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-neutral-900">
                        {formatRoleLabel(user)}
                      </div>

                      {user.role_key && (
                        <div className="mt-1 font-mono text-xs text-neutral-500">
                          {user.role_key}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      <div>{user.department ?? "—"}</div>

                      {user.job_title && (
                        <div className="mt-1 text-xs text-neutral-500">
                          {user.job_title}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-neutral-700">
                      {user.camp_count > 0 ? (
                        <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {user.camp_count}{" "}
                          {user.camp_count === 1 ? "camp" : "camps"}
                        </span>
                      ) : (
                        <span className="text-neutral-400">Global / none</span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                          accountStatusTone(user.account_status),
                        ].join(" ")}
                      >
                        {formatAccountStatus(user.account_status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs text-neutral-500">
                      {formatDateTime(user.created_at)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {canDeleteInvitedUser ? (
                        <DeleteInvitedUserButton
                          userId={user.id}
                          fullName={user.full_name}
                          email={user.email}
                        />
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14">
                    <div className="mx-auto max-w-sm text-center">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-neutral-100 text-lg font-semibold text-neutral-500">
                        U
                      </div>

                      <h3 className="mt-4 text-sm font-semibold text-neutral-950">
                        No users found
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        Invite your first system user to create the Auth invite,
                        profile, role, and camp access records.
                      </p>

                      {canInviteUsers && (
                        <Link
                          href="/admin/users/invite"
                          className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-neutral-950 px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
                        >
                          Invite user
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
