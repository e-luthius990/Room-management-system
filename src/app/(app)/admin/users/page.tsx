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
              className="btn-primary btn-lg"
            >
              Invite user
            </Link>
          ) : null
        }
      />

      {(errorMessage || successMessage) && (
        <section className="grid gap-3">
          {errorMessage && (
            <div className="border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="border border-success-600/25 bg-success-50 px-4 py-3 text-sm font-medium text-success-700">
              {successMessage}
            </div>
          )}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Active users</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {activeCount}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Profiles currently allowed to access the system.
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            Pending invites
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {invitedCount}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Auth invites waiting for user acceptance.
          </p>
        </div>

        <div className="surface-card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
            Restricted accounts
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {restrictedCount}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Suspended, disabled, or expired invite records.
          </p>
        </div>
      </section>

      <section className="table-shell">
        <div className="flex flex-col gap-2 border-b border-border bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              System user registry
            </h2>
            <p className="mt-1 text-xs text-muted">
              Source of truth: profiles, user_roles, roles, and
              user_camp_access.
            </p>
          </div>

          <div className="text-xs font-medium text-muted">
            {users.length} {users.length === 1 ? "record" : "records"}
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table min-w-[1120px]">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Camp access</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => {
                const canDeleteInvitedUser =
                  isSuperAdmin &&
                  currentUser.profile.id !== user.id &&
                  user.account_status === "invited";

                return (
                  <tr
                    key={user.id}
                    className="align-top"
                  >
                    <td>
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center bg-foreground text-xs font-semibold text-background">
                          {getInitials(user.full_name)}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">
                            {user.full_name}
                          </div>

                          <div className="mt-1 truncate text-xs text-muted">
                            {user.email ?? "No email"}
                          </div>

                          {user.phone && (
                            <div className="mt-1 text-xs text-muted">
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="font-medium text-foreground">
                        {formatRoleLabel(user)}
                      </div>

                      {user.role_key && (
                        <div className="mt-1 font-mono text-xs text-muted">
                          {user.role_key}
                        </div>
                      )}
                    </td>

                    <td className="text-foreground">
                      <div>{user.department ?? "—"}</div>

                      {user.job_title && (
                        <div className="mt-1 text-xs text-muted">
                          {user.job_title}
                        </div>
                      )}
                    </td>

                    <td className="text-foreground">
                      {user.camp_count > 0 ? (
                        <span className="inline-flex border border-info-600/25 bg-info-50 px-2.5 py-1 text-xs font-semibold text-info-700">
                          {user.camp_count}{" "}
                          {user.camp_count === 1 ? "camp" : "camps"}
                        </span>
                      ) : (
                        <span className="text-muted">Global / none</span>
                      )}
                    </td>

                    <td>
                      <span
                        className={[
                          "inline-flex border px-2.5 py-1 text-xs font-semibold",
                          accountStatusTone(user.account_status),
                        ].join(" ")}
                      >
                        {formatAccountStatus(user.account_status)}
                      </span>
                    </td>

                    <td className="text-xs text-muted">
                      {formatDateTime(user.created_at)}
                    </td>

                    <td className="text-right">
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
                      <div className="mx-auto flex size-10 items-center justify-center border border-border bg-surface-2 text-sm font-semibold text-muted">
                        U
                      </div>

                      <h3 className="mt-4 text-sm font-semibold text-foreground">
                        No users found
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-muted">
                        Invite your first system user to create the Auth invite,
                        profile, role, and camp access records.
                      </p>

                      {canInviteUsers && (
                        <Link
                          href="/admin/users/invite"
                          className="btn-primary btn-lg mt-5"
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
