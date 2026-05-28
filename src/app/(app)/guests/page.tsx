import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { Search, UserPlus, X } from "lucide-react";

import { requirePermission } from "@/lib/auth/require-permission";
import { getGuests } from "@/lib/queries/guests/get-guests";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { cn } from "@/lib/utils/cn";

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
      return "status-cleared";

    case "watchlist":
    case "suspended":
      return "status-watchlist";

    case "denied":
      return "status-denied";

    case "pending":
      return "status-pending";

    default:
      return "status-muted";
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
    profile_photo_required: "Take or upload a guest profile photo.",
    unsupported_profile_photo_type: "Use a JPG, PNG, or WebP profile photo.",
    profile_photo_too_large: "Profile photo must be 4 MB or smaller.",
    profile_photo_upload_failed: "Profile photo could not be uploaded.",
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
    <div className="space-y-3">
      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      <section className="surface-panel overflow-hidden">
        <form
          method="get"
          action="/guests"
          className="border-b border-border bg-surface px-3 py-3"
        >
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
              <div className="ops-search min-w-0">
                <Search aria-hidden="true" className="ops-search-icon" />

                <input
                  id="guest-search"
                  name="q"
                  defaultValue={query}
                  className="ops-search-input h-10 rounded-md pr-10"
                  placeholder="Search name, phone, email, organization, project, nationality..."
                  autoComplete="off"
                />

                {query ? (
                  <Link
                    href="/guests"
                    aria-label="Clear guest search"
                    className="absolute right-3 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted hover:bg-surface-2 hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </Link>
                ) : null}
              </div>

              <button type="submit" className="btn-primary h-10 px-4">
                Search
              </button>
            </div>

            <Link
              href="/guests/new"
              className="btn-secondary h-10 justify-center px-4"
            >
              <UserPlus aria-hidden="true" className="size-4" />
              Add guest
            </Link>
          </div>
        </form>

        <div className="table-shell rounded-none border-0 shadow-none">
          <div className="table-scroll">
            <table className="data-table min-w-[1040px] table-fixed [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2">
              <colgroup>
                <col className="w-[310px]" />
                <col className="w-[155px]" />
                <col className="w-[150px]" />
                <col className="w-[230px]" />
                <col className="w-[135px]" />
                <col className="w-[80px]" />
              </colgroup>

              <thead>
                <tr>
                  <th className="text-left">Guest</th>
                  <th className="text-left">Camp</th>
                  <th className="text-left">Category</th>
                  <th className="text-left">Contact</th>
                  <th className="text-left">Clearance</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {guests.length === 0 ? (
                  <tr className="table-empty-row">
                    <td colSpan={6}>
                      {query
                        ? "No guests match the current search."
                        : "No guests found."}
                    </td>
                  </tr>
                ) : (
                  guests.map((guest) => {
                    const organization =
                      guest.organization_name?.trim() || "No organization";
                    const project = guest.department_or_project?.trim();

                    return (
                      <tr key={guest.id} className="align-middle">
                        <td>
                          <GuestNameWithPhoto
                            guestId={guest.id}
                            name={guest.full_name}
                            photoPath={guest.profile_photo_path}
                            photoUpdatedAt={guest.profile_photo_updated_at}
                            className="w-full"
                          >
                            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted">
                              <span
                                className="max-w-[12rem] truncate"
                                title={organization}
                              >
                                {organization}
                              </span>

                              {project ? (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className="text-muted-2"
                                  >
                                    /
                                  </span>
                                  <span
                                    className="max-w-[10rem] truncate"
                                    title={project}
                                  >
                                    {project}
                                  </span>
                                </>
                              ) : null}
                            </div>
                          </GuestNameWithPhoto>
                        </td>

                        <td className="text-sm text-muted">
                          <div
                            className="truncate font-medium text-foreground-soft"
                            title={guest.primary_camp_name}
                          >
                            {guest.primary_camp_name}
                          </div>
                        </td>

                        <td className="text-sm text-muted">
                          <span className="inline-flex max-w-full truncate">
                            {formatLabel(guest.guest_category)}
                          </span>
                        </td>

                        <td className="text-sm">
                          <div
                            className="truncate font-medium text-foreground-soft"
                            title={guest.phone ?? "No phone"}
                          >
                            {guest.phone ?? "No phone"}
                          </div>

                          <div
                            className="mt-0.5 truncate text-xs text-muted"
                            title={guest.email ?? "No email"}
                          >
                            {guest.email ?? "No email"}
                          </div>
                        </td>

                        <td>
                          <span
                            className={cn(
                              "status-indicator status-indicator-compact",
                              getClearanceClass(
                                guest.security_clearance_status,
                              ),
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className="status-dot shrink-0"
                            />
                            <span className="min-w-0 truncate">
                              {getClearanceLabel(
                                guest.security_clearance_status,
                              )}
                            </span>
                          </span>
                        </td>

                        <td className="text-right">
                          <Link
                            href={`/guests/${guest.id}`}
                            className="inline-action"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
