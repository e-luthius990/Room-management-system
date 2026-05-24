import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/require-permission";
import { getGuests } from "@/lib/queries/guests/get-guests";

type GuestsPageProps = {
  searchParams?: Promise<{
    q?: string;
    error?: string;
    success?: string;
  }>;
};

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getClearanceLabel(value: string | null): string {
  return value ? formatLabel(value) : "Not set";
}

function getClearanceClass(value: string | null): string {
  switch (value) {
    case "cleared":
      return "border-success-600/25 bg-success-50 text-success-700";

    case "watchlist":
    case "suspended":
      return "border-warning-700/25 bg-warning-50 text-warning-700";

    case "denied":
      return "border-danger-600/25 bg-danger-50 text-danger-700";

    case "pending":
      return "border-info-600/25 bg-info-50 text-info-700";

    default:
      return "border-border bg-surface-2 text-muted";
  }
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
  noStore();

  await requirePermission("guests.view");

  const params = searchParams ? await searchParams : undefined;
  const query = params?.q?.trim() ?? "";

  if (params?.success) {
    redirect(query ? `/guests?q=${encodeURIComponent(query)}` : "/guests");
  }

  const guests = await getGuests(query);
  const errorMessage = getErrorMessage(params?.error);

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 border-b border-border px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Reception registry
            </p>

            <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
              Guest directory
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Search guest profiles, delegate records, visitors, contractors,
              and staff accommodation identities.
            </p>
          </div>

          <Link href="/guests/new" className="btn-primary">
            Add guest
          </Link>
        </div>
      </section>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      <section className="surface-panel overflow-hidden">
        <form
          className="border-b border-border px-4 py-3"
          method="get"
          action="/guests"
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
            <div className="min-w-0">
              <label
                htmlFor="guest-search"
                className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted"
              >
                Search register
              </label>

              <input
                id="guest-search"
                name="q"
                defaultValue={query}
                className="input-field"
                placeholder="Search by name, phone, email, organization, project, or nationality..."
              />
            </div>

            <button type="submit" className="btn-primary">
              Search
            </button>

            {query ? (
              <Link href="/guests" className="btn-secondary">
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        <div className="table-shell rounded-none border-0 shadow-none">
          <div className="table-scroll">
            <table className="data-table min-w-[980px] table-fixed [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5">
              <colgroup>
                <col className="w-[260px]" />
                <col className="w-[160px]" />
                <col className="w-[150px]" />
                <col className="w-[210px]" />
                <col className="w-[130px]" />
                <col className="w-[90px]" />
              </colgroup>

              <thead>
                <tr>
                  <th className="text-left">Guest</th>
                  <th className="text-left">Camp</th>
                  <th className="text-left">Category</th>
                  <th className="text-left">Contact</th>
                  <th className="text-left">Clearance</th>
                  <th className="text-right" />
                </tr>
              </thead>

              <tbody>
                {guests.length === 0 ? (
                  <tr className="table-empty-row">
                    <td colSpan={6}>No guests found.</td>
                  </tr>
                ) : (
                  guests.map((guest) => (
                    <tr key={guest.id} className="align-top">
                      <td>
                        <div
                          className="truncate font-semibold text-foreground"
                          title={guest.full_name}
                        >
                          {guest.full_name}
                        </div>

                        <div
                          className="mt-1 line-clamp-2 text-xs leading-5 text-muted"
                          title={guest.organization_name ?? "No organization"}
                        >
                          {guest.organization_name ?? "No organization"}
                        </div>

                        {guest.department_or_project ? (
                          <div
                            className="mt-1 truncate text-xs text-muted"
                            title={guest.department_or_project}
                          >
                            {guest.department_or_project}
                          </div>
                        ) : null}
                      </td>

                      <td className="text-sm text-muted">
                        <div
                          className="truncate leading-5"
                          title={guest.primary_camp_name}
                        >
                          {guest.primary_camp_name}
                        </div>
                      </td>

                      <td className="text-sm text-muted">
                        {formatLabel(guest.guest_category)}
                      </td>

                      <td className="text-sm text-muted">
                        <div className="truncate" title={guest.phone ?? "—"}>
                          {guest.phone ?? "—"}
                        </div>

                        <div
                          className="mt-1 truncate text-xs text-muted"
                          title={guest.email ?? "No email"}
                        >
                          {guest.email ?? "No email"}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`inline-flex border px-2 py-0.5 text-[11px] font-bold ${getClearanceClass(
                            guest.security_clearance_status,
                          )}`}
                        >
                          {getClearanceLabel(guest.security_clearance_status)}
                        </span>
                      </td>

                      <td className="text-right">
                        <Link
                          href={`/guests/${guest.id}`}
                          className="btn-secondary btn-sm"
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
      </section>
    </div>
  );
}
