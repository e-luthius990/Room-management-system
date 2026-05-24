import Link from "next/link";
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
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 border-b border-border px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Reception registry
            </p>

            <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
              Add guest
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Create a guest identity before reservation, room allocation,
              security handoff, or check-in.
            </p>
          </div>

          <Link href="/guests" className="btn-secondary">
            Back to guests
          </Link>
        </div>
      </section>

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
          <div className="border-b border-border px-4 py-4">
            <h2 className="text-sm font-semibold tracking-[-0.015em] text-foreground">
              Guest record
            </h2>

            <p className="mt-1 text-xs leading-5 text-muted">
              Capture identity, camp, organization, contact, and classification
              details used across reception and security workflows.
            </p>
          </div>

          <div className="p-4">
            <GuestForm camps={camps} />
          </div>
        </section>
      )}
    </main>
  );
}
