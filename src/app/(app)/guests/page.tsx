import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getGuests } from "@/lib/queries/guests/get-guests";

type GuestsPageProps = {
  searchParams?: Promise<{
    q?: string;
    error?: string;
    success?: string;
  }>;
};

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getClearanceLabel(value: string | null): string {
  return value ? formatLabel(value) : "Not set";
}

function getSuccessMessage(success?: string): string | null {
  const messages: Record<string, string> = {
    guest_created: "Guest record created successfully.",
    guest_updated: "Guest record updated successfully.",
  };

  return success ? (messages[success] ?? null) : null;
}

function getErrorMessage(error?: string): string | null {
  const messages: Record<string, string> = {
    invalid_input: "Check the form and try again.",
    duplicate_guest: "A matching guest record already exists.",
    invalid_name: "Guest name is invalid.",
    invalid_gender: "Gender value is invalid.",
    camp_not_allowed: "You do not have access to manage guests in that camp.",
    access_denied: "You do not have permission to perform that action.",
    create_failed: "Guest could not be created.",
    update_failed: "Guest could not be updated.",
  };

  return error
    ? (messages[error] ?? "The request could not be completed.")
    : null;
}

export default async function GuestsPage({
  searchParams,
}: GuestsPageProps): Promise<React.JSX.Element> {
  await requirePermission("guests.view");

  const params = searchParams ? await searchParams : undefined;
  const query = params?.q?.trim() ?? "";
  const guests = await getGuests(query);

  const successMessage = getSuccessMessage(params?.success);
  const errorMessage = getErrorMessage(params?.error);

  return (
    <div>
      <PageHeader
        title="Guest Directory"
        description="Search and manage guests, delegates, visitors, contractors, and staff accommodation records."
        actions={
          <Link
            href="/guests/new"
            className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Add guest
          </Link>
        }
      />

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <form className="mb-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            name="q"
            defaultValue={query}
            className="min-h-11 flex-1 rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Search by name, phone, email, organization, project, or nationality..."
          />

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Search
            </button>

            {query ? (
              <Link
                href="/guests"
                className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Camp</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Clearance</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {guests.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No guests found.
                  </td>
                </tr>
              ) : (
                guests.map((guest) => (
                  <tr key={guest.id} className="align-top">
                    <td className="px-4 py-4">
                      <div className="font-medium text-neutral-950">
                        {guest.full_name}
                      </div>

                      <div className="mt-1 text-xs text-neutral-500">
                        {guest.organization_name ?? "No organization"}
                      </div>

                      {guest.department_or_project ? (
                        <div className="mt-1 text-xs text-neutral-500">
                          {guest.department_or_project}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {guest.primary_camp_name}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {formatLabel(guest.guest_category)}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      <div>{guest.phone ?? "—"}</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {guest.email ?? "No email"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {getClearanceLabel(guest.security_clearance_status)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/guests/${guest.id}`}
                        className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
