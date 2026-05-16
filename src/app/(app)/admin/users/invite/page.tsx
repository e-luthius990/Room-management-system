import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { inviteUserAction } from "@/lib/actions/admin/invite-user";
import {
  getCampOptions,
  getInviteRoleOptions,
} from "@/lib/queries/admin-users";
import { campAccessLevelOptions } from "@/lib/validation/admin-users";

type InviteUserPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the invite details and try again.",
    forbidden: "You do not have access to invite users.",
    role_not_allowed: "You are not allowed to assign that role.",
    role_not_found: "Selected role was not found.",
    camp_required: "Select a camp for this role.",
    camp_not_found: "Selected camp was not found.",
    camp_not_allowed: "You cannot assign access to that camp.",
    user_exists: "A user with this email already exists.",
    access_denied: "You do not have access to perform this action.",
    invite_failed: "User invite could not be sent.",
    profile_create_failed:
      "The user was invited, but the internal profile could not be created.",
    role_assign_failed:
      "The user was invited, but the role could not be assigned.",
    camp_access_failed:
      "The user was invited, but camp access could not be assigned.",
  };

  return messages[error] ?? "User invite could not be completed.";
}

export default async function InviteUserPage({
  searchParams,
}: InviteUserPageProps): Promise<React.JSX.Element> {
  const currentUser = await requirePermission("users.invite");

  const [params, roles, camps] = await Promise.all([
    searchParams,
    getInviteRoleOptions(currentUser.role.key),
    getCampOptions(),
  ]);

  const errorMessage = getErrorMessage(params?.error);

  return (
    <div>
      <PageHeader
        title="Invite user"
        description="Invite staff into the internal room operations system and assign their role and camp access."
        actions={
          <Link
            href="/admin/users"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Back to users
          </Link>
        }
      />

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={inviteUserAction}
        className="max-w-3xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="invite-full-name"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Full name
            </label>

            <input
              id="invite-full-name"
              required
              name="fullName"
              autoComplete="name"
              maxLength={120}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              placeholder="Staff full name"
            />
          </div>

          <div>
            <label
              htmlFor="invite-email"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Email
            </label>

            <input
              id="invite-email"
              required
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              placeholder="name@company.com"
            />
          </div>

          <div>
            <label
              htmlFor="invite-phone"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Phone
            </label>

            <input
              id="invite-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={120}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              placeholder="+256..."
            />
          </div>

          <div>
            <label
              htmlFor="invite-department"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Department
            </label>

            <input
              id="invite-department"
              name="department"
              autoComplete="organization"
              maxLength={120}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              placeholder="Reception, Maintenance, Housekeeping..."
            />
          </div>

          <div>
            <label
              htmlFor="invite-job-title"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Job title
            </label>

            <input
              id="invite-job-title"
              name="jobTitle"
              autoComplete="organization-title"
              maxLength={120}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              placeholder="Receptionist, Supervisor..."
            />
          </div>

          <div>
            <label
              htmlFor="invite-role-key"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Role
            </label>

            <select
              id="invite-role-key"
              required
              name="roleKey"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
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

            {roles.length === 0 ? (
              <p className="mt-2 text-xs leading-5 text-red-600">
                No assignable roles are available for your account.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="invite-camp-id"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Camp
            </label>

            <select
              id="invite-camp-id"
              name="campId"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              defaultValue=""
            >
              <option value="">No camp for system role</option>

              {camps.map((camp) => (
                <option key={camp.id} value={camp.id}>
                  {camp.name} ({camp.code})
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Camp roles require a camp. System roles can be invited without
              camp access.
            </p>
          </div>

          <div>
            <label
              htmlFor="invite-access-level"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Access level
            </label>

            <select
              id="invite-access-level"
              name="accessLevel"
              className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
              defaultValue=""
            >
              <option value="">Use role minimum</option>

              {campAccessLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs leading-5 text-neutral-500">
              If the selected level is below the role minimum, the server will
              raise it to the required minimum.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          The user will receive a Supabase invite email. Their account remains
          in invited status until they accept the invite.
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={roles.length === 0}
            className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            Send invite
          </button>
        </div>
      </form>
    </div>
  );
}
