import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { GuestForm } from "@/components/guests/guest-form";
import { GuestDocumentsPanel } from "@/components/guest-documents/guest-documents-panel";
import { getCampOptions } from "@/lib/queries/setup/options";
import { getGuestProfile } from "@/lib/queries/guests/get-guest-profile";

type GuestProfilePageProps = {
  params: Promise<{
    guestId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
  };

  return messages[error] ?? "The request could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (!success) return null;

  const messages: Record<string, string> = {
    guest_created: "Guest created successfully.",
    guest_updated: "Guest saved successfully.",
    document_uploaded: "Private guest document uploaded successfully.",
  };

  return messages[success] ?? null;
}

export default async function GuestProfilePage({
  params,
  searchParams,
}: GuestProfilePageProps): Promise<React.JSX.Element> {
  await requirePermission("guests.view");

  const { guestId } = await params;
  const query = searchParams ? await searchParams : undefined;

  const [{ guest, stays, documents }, camps] = await Promise.all([
    getGuestProfile(guestId),
    getCampOptions(),
  ]);

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  return (
    <div>
      <PageHeader
        title={guest.full_name}
        description="Guest profile, contact details, security clearance, private documents, and stay history."
        actions={
          <Link
            href="/guests"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Back to guests
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

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <GuestForm camps={camps} guest={guest} />

        <aside className="space-y-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-950">
              Guest Summary
            </h2>

            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-neutral-500">Primary camp</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {guest.primary_camp_name}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Category</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {formatLabel(guest.guest_category)}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">VIP</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {guest.is_vip ? "Yes" : "No"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Organization</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {guest.organization_name ?? "Not set"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Department / project</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {guest.department_or_project ?? "Not set"}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Security clearance</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {formatLabel(guest.security_clearance_status)}
                </dd>
              </div>

              <div>
                <dt className="text-neutral-500">Created</dt>
                <dd className="mt-1 font-medium text-neutral-950">
                  {formatDate(guest.created_at)}
                </dd>
              </div>
            </dl>
          </section>

          <GuestDocumentsPanel guestId={guest.id} documents={documents} />
        </aside>
      </div>

      <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-neutral-950">
          Stay History
        </h2>

        <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Camp</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expected</th>
                  <th className="px-4 py-3">Actual</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {stays.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm text-neutral-500"
                    >
                      No stay history yet.
                    </td>
                  </tr>
                ) : (
                  stays.map((stay) => (
                    <tr key={stay.id} className="align-top">
                      <td className="px-4 py-4 font-medium text-neutral-950">
                        {stay.room_number}
                      </td>

                      <td className="px-4 py-4 text-neutral-700">
                        {stay.camp_name}
                      </td>

                      <td className="px-4 py-4 text-neutral-700">
                        {formatLabel(stay.status)}
                      </td>

                      <td className="px-4 py-4 text-neutral-700">
                        {formatDate(stay.expected_arrival_at)} →{" "}
                        {formatDate(stay.expected_departure_at)}
                      </td>

                      <td className="px-4 py-4 text-neutral-700">
                        {formatDate(stay.checked_in_at)} →{" "}
                        {formatDate(stay.checked_out_at)}
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
