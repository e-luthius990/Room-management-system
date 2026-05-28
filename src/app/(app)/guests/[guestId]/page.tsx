import Link from "next/link";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/require-permission";
import { GuestForm } from "@/components/guests/guest-form";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { GuestDocumentsPanel } from "@/components/guest-documents/guest-documents-panel";
import { getCampOptions } from "@/lib/queries/setup/options";
import { getGuestProfile } from "@/lib/queries/guests/get-guest-profile";
import { ClearanceStatusBadge } from "@/components/security/security-status-badge";

type GuestProfilePageProps = {
  params: Promise<{
    guestId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

const DATE_FORMATTER = new Intl.DateTimeFormat("en-UG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Kampala",
});

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return DATE_FORMATTER.format(date);
}

function formatLabel(value: string | null): string {
  if (!value) return "Not set";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getErrorMessage(error?: string): string | null {
  if (!error) return null;

  const messages: Record<string, string> = {
    invalid_input: "Check the form and try again.",
    invalid_name: "Guest name is invalid.",
    invalid_gender: "Gender value is invalid.",
    duplicate_guest: "A matching guest record already exists.",
    guest_not_found: "Guest was not found.",
    camp_not_allowed: "You do not have access to the selected camp.",
    access_denied: "You do not have access to perform this action.",
    create_failed: "Guest could not be created.",
    update_failed: "Guest could not be updated.",

    invalid_document_input: "Check the document upload fields and try again.",
    document_file_required: "Select a document file before uploading.",
    unsupported_file_type: "Only PDF, JPG, PNG, and WEBP files are allowed.",
    file_too_large: "The document is too large. Maximum size is 10MB.",
    invalid_document_storage: "The document could not be stored safely.",
    document_download_failed: "Secure document link could not be created.",
    upload_failed: "Document upload failed. Please try again.",
    profile_photo_required: "Take or upload a guest profile photo.",
    unsupported_profile_photo_type: "Use a JPG, PNG, or WebP profile photo.",
    profile_photo_too_large: "Profile photo must be 4 MB or smaller.",
    profile_photo_upload_failed: "Profile photo could not be uploaded.",
  };

  return messages[error] ?? "The request could not be completed.";
}

export default async function GuestProfilePage({
  params,
  searchParams,
}: GuestProfilePageProps): Promise<React.JSX.Element> {
  await requirePermission("guests.view");

  const { guestId } = await params;
  const query = searchParams ? await searchParams : undefined;

  if (query?.success) {
    redirect(`/guests/${guestId}`);
  }

  const [{ guest, stays, documents }, camps] = await Promise.all([
    getGuestProfile(guestId),
    getCampOptions(),
  ]);

  const errorMessage = getErrorMessage(query?.error);

  return (
    <main className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border bg-surface px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Guest record
              </p>

              <div className="mt-2">
                <GuestNameWithPhoto
                  guestId={guest.id}
                  name={guest.full_name}
                  photoPath={guest.profile_photo_path}
                  photoUpdatedAt={guest.profile_photo_updated_at}
                  size="lg"
                />
              </div>

              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Guest profile, reception identity, security clearance, protected
                documents, and stay history.
              </p>
            </div>

            <Link
              href="/guests"
              className="btn-secondary inline-flex min-h-10 items-center justify-center px-4 text-sm font-semibold"
            >
              Back to guests
            </Link>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="min-w-0">
          <GuestForm camps={camps} guest={guest} />
        </div>

        <aside className="space-y-5">
          <section className="border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                Registry summary
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Fixed identity context for reception and security workflows.
              </p>
            </div>

            <dl className="px-4 text-sm">
              <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Primary camp</dt>
                <dd className="font-medium text-foreground">
                  {guest.primary_camp_name}
                </dd>
              </div>

              <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium text-foreground">
                  {formatLabel(guest.guest_category)}
                </dd>
              </div>

              <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Clearance</dt>
                <dd>
                  <ClearanceStatusBadge
                    status={guest.security_clearance_status}
                  />
                </dd>
              </div>

              <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">VIP</dt>
                <dd className="font-medium text-foreground">
                  {guest.is_vip ? "Yes" : "No"}
                </dd>
              </div>

              <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Organization</dt>
                <dd className="font-medium text-foreground">
                  {guest.organization_name ?? "Not set"}
                </dd>
              </div>

              <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Department / project</dt>
                <dd className="font-medium text-foreground">
                  {guest.department_or_project ?? "Not set"}
                </dd>
              </div>

              <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium text-foreground">
                  {guest.phone ?? "Not set"}
                </dd>
              </div>

              <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium text-foreground">
                  {guest.email ?? "Not set"}
                </dd>
              </div>

              <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(guest.created_at)}
                </dd>
              </div>
            </dl>
          </section>

          <GuestDocumentsPanel guestId={guest.id} documents={documents} />
        </aside>
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border bg-surface px-4 py-4 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">
            Stay history
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Previous and current accommodation records linked to this guest.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs uppercase tracking-[0.16em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold sm:px-5">Room</th>
                <th className="px-4 py-3 font-semibold">Camp</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Expected window</th>
                <th className="px-4 py-3 font-semibold">Actual movement</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {stays.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 sm:px-5">
                    <div className="max-w-xl">
                      <p className="text-sm font-semibold text-foreground">
                        No stay history yet
                      </p>

                      <p className="mt-1 text-sm text-muted-foreground">
                        This guest has not been checked into a room or linked to
                        a completed stay record yet.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                stays.map((stay) => (
                  <tr
                    key={stay.id}
                    className="align-top transition-colors hover:bg-muted/35"
                  >
                    <td className="px-4 py-4 sm:px-5">
                      <span className="text-lg font-semibold tracking-tight text-foreground">
                        {stay.room_number}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-foreground">
                      {stay.camp_name}
                    </td>

                    <td className="px-4 py-4 text-foreground">
                      {formatLabel(stay.status)}
                    </td>

                    <td className="px-4 py-4 text-foreground">
                      <div>{formatDate(stay.expected_arrival_at)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        to {formatDate(stay.expected_departure_at)}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-foreground">
                      <div>{formatDate(stay.checked_in_at)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        to {formatDate(stay.checked_out_at)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
