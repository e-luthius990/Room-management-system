import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { GuestForm } from "@/components/guests/guest-form";
import { getCampOptions } from "@/lib/queries/setup/options";

type NewGuestPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string): string | null {
  const messages: Record<string, string> = {
    invalid_input: "Check the form and try again.",
    duplicate_guest: "A matching guest record already exists.",
    invalid_name: "Guest name is invalid.",
    invalid_gender: "Gender value is invalid.",
    camp_not_allowed: "You do not have access to create guests in that camp.",
    access_denied: "You do not have permission to create guests.",
    create_failed: "Guest could not be created.",
  };

  return error ? (messages[error] ?? "The guest could not be created.") : null;
}

export default async function NewGuestPage({
  searchParams,
}: NewGuestPageProps): Promise<React.JSX.Element> {
  await requirePermission("guests.create");

  const params = searchParams ? await searchParams : undefined;
  const camps = await getCampOptions();
  const errorMessage = getErrorMessage(params?.error);

  return (
    <div>
      <PageHeader
        title="Add Guest"
        description="Create a guest profile before reservation, room allocation, or check-in."
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

      {camps.length === 0 ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          No accessible camps were found. You need operator access to at least
          one active camp before creating a guest.
        </div>
      ) : (
        <GuestForm camps={camps} />
      )}
    </div>
  );
}
