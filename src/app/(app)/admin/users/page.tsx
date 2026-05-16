import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getAdminUsers } from "@/lib/queries/admin-users";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DeleteInvitedUserButton } from "@/components/users/delete-invited-user-button";

type AdminUsersPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function getSuccessMessage(success?: string): string | null {
  if (success === "user_invited") {
    return "User invite sent successfully.";
  }

  return null;
}

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the user details and try again.",
    forbidden: "You do not have access to invite users.",
    role_not_allowed: "You cannot assign that role.",
    role_not_found: "Selected role was not found.",
    camp_required: "Select a camp for this role.",
    camp_not_found: "Selected camp was not found.",
    camp_not_allowed: "You do not have admin access to that camp.",
    user_exists: "A user with this email already exists.",
    access_denied: "You do not have access to perform this action.",
    invite_failed: "User invite could not be sent.",
  };

  return messages[error] ?? "User action could not be completed.";
}

function formatLabel(value: string | null): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function accountStatusTone(status: string): string {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "invited":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "suspended":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "disabled":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

async function getCurrentUserAccess(): Promise<{
  id: string;
  isSuperAdmin: boolean;
}> {
  const supabase = await createServerSupabaseClient();

  const { data: authUserResult, error: authUserError } =
    await supabase.auth.getUser();

  if (authUserError || !authUserResult.user) {
    return {
      id: "",
      isSuperAdmin: false,
    };
  }

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("roles!inner(key)")
    .eq("user_id", authUserResult.user.id)
    .is("revoked_at", null)
    .eq("roles.key", "super_admin")
    .maybeSingle();

  return {
    id: authUserResult.user.id,
    isSuperAdmin: Boolean(roleRow),
  };
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps): Promise<React.JSX.Element> {
  await requirePermission("users.view");

  const [params, users, currentUserAccess] = await Promise.all([
    searchParams,
    getAdminUsers(),
    getCurrentUserAccess(),
  ]);

  const successMessage = getSuccessMessage(params?.success);
  const errorMessage = getErrorMessage(params?.error);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage internal users, account status, role assignment, and camp access."
        actions={
          <Link
            href="/admin/users/invite"
            className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Invite user
          </Link>
        }
      />

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Camp access</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100">
            {users.map((user) => {
              const canDelete =
                currentUserAccess.isSuperAdmin &&
                currentUserAccess.id !== user.id &&
                user.account_status === "invited";

              return (
                <tr key={user.id} className="align-top">
                  <td className="px-4 py-4">
                    <div className="font-medium text-neutral-950">
                      {user.full_name}
                    </div>

                    <div className="mt-1 text-xs text-neutral-500">
                      {user.email ?? "No email"}
                    </div>

                    {user.phone ? (
                      <div className="mt-1 text-xs text-neutral-500">
                        {user.phone}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-medium text-neutral-900">
                      {user.role_name ?? "No role assigned"}
                    </div>

                    {user.role_key ? (
                      <div className="mt-1 font-mono text-xs text-neutral-500">
                        {user.role_key}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4 text-neutral-700">
                    <div>{user.department ?? "—"}</div>

                    {user.job_title ? (
                      <div className="mt-1 text-xs text-neutral-500">
                        {user.job_title}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4 text-neutral-700">
                    {user.camp_count === 0 ? (
                      <span className="text-neutral-400">—</span>
                    ) : (
                      <span>
                        {user.camp_count}{" "}
                        {user.camp_count === 1 ? "camp" : "camps"}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        accountStatusTone(user.account_status),
                      ].join(" ")}
                    >
                      {formatLabel(user.account_status)}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-right">
                    {canDelete ? (
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

            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-neutral-500"
                >
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
