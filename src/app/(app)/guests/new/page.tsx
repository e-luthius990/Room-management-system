import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { GuestForm } from "@/components/guests/guest-form";
import { getCampOptions } from "@/lib/queries/setup/options";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    profile_photo_required: "Take or upload a guest profile photo.",
    unsupported_profile_photo_type: "Use a JPG, PNG, or WebP profile photo.",
    profile_photo_too_large: "Profile photo must be 4 MB or smaller.",
    profile_photo_upload_failed: "Profile photo could not be uploaded.",
  };

  return error ? (messages[error] ?? "The guest could not be created.") : null;
}

export default async function NewGuestPage({
  searchParams,
}: NewGuestPageProps): Promise<React.JSX.Element> {
  noStore();

  await requirePermission("guests.create");

  const params = searchParams ? await searchParams : undefined;

  const [camps] = await Promise.all([getCampOptions()]);

  const errorMessage = getErrorMessage(params?.error);

  return (
    <main className="page-stack">
      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {camps.length === 0 ? (
        <section className="surface-panel px-4 py-4">
          <p className="text-sm font-semibold text-foreground">
            No accessible camps found
          </p>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            You need operator access to at least one active camp before creating
            a guest.
          </p>
        </section>
      ) : (
        <section className="surface-panel overflow-hidden">
          <div className="p-4">
            <GuestForm camps={camps} />
          </div>
        </section>
      )}
    </main>
  );
}
