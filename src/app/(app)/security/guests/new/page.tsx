import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SecurityGuestIntakeForm } from "@/components/security/security-guest-intake-form";
import { EmptyState } from "@/components/ui/EmptyState";

type PageSearchParams = {
  error?: string | string[];
};

type SecurityGuestIntakePageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

type CampOption = {
  id: string;
  name: string;
  code: string;
  location: string | null;
};

function getFirstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the guest intake form and try again.",
    invalid_camp: "Select a valid camp for this guest.",
    invalid_guest_category: "Select a valid guest category.",
    invalid_email: "Enter a valid email address or leave it blank.",
    access_denied: "You do not have access to register security guests.",
    possible_duplicate_guest:
      "A similar guest record may already exist. Check the security review before creating another one.",
    guest_create_failed: "Guest intake record could not be created.",
  };

  return messages[error] ?? "Guest intake record could not be created.";
}

async function getCampOptions(): Promise<CampOption[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("camps")
    .select("id,name,code,location")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .returns<CampOption[]>();

  if (error) {
    throw new Error(`Failed to load camp options: ${error.message}`);
  }

  return data ?? [];
}

export default async function NewSecurityGuestPage({
  searchParams,
}: SecurityGuestIntakePageProps): Promise<React.JSX.Element> {
  await requirePermission("security.create_guest_intake");

  const resolvedSearchParams: PageSearchParams = searchParams
    ? await searchParams
    : {};

  const camps = await getCampOptions();

  const errorMessage = getErrorMessage(
    getFirstParam(resolvedSearchParams.error),
  );

  return (
    <div className="page-stack">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="page-kicker">Security intake</div>

          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl">
            Register visitor
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Create a limited guest intake record for security clearance and gate
            operations.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href={APP_ROUTES.security.review} className="btn-secondary">
            Security review
          </Link>

          <Link href={APP_ROUTES.security.gate} className="btn-primary">
            Gate operations
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {camps.length === 0 ? (
        <EmptyState
          title="No camps available"
          description="A camp is required before security can register a guest. Ask an administrator to create or restore an active camp."
          action={
            <Link href={APP_ROUTES.security.review} className="btn-secondary">
              Back to security review
            </Link>
          }
        />
      ) : (
        <SecurityGuestIntakeForm camps={camps} />
      )}
    </div>
  );
}
