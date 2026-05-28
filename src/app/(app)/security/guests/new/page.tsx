import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SecurityGuestIntakeForm } from "@/components/security/security-guest-intake-form";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  return Array.isArray(value) ? value[0] : value;
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
    profile_photo_required: "Take or upload a guest profile photo.",
    unsupported_profile_photo_type: "Use a JPG, PNG, or WebP profile photo.",
    profile_photo_too_large: "Profile photo must be 4 MB or smaller.",
    profile_photo_upload_failed: "Profile photo could not be uploaded.",
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
  noStore();

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
      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {camps.length === 0 ? (
        <section className="surface-panel p-4">
          <EmptyState
            title="No camps available"
            description="A camp is required before security can register a guest. Ask an administrator to create or restore an active camp."
          />
        </section>
      ) : (
        <section className="surface-panel overflow-hidden">
          <div className="p-4">
            <SecurityGuestIntakeForm camps={camps} />
          </div>
        </section>
      )}
    </div>
  );
}
