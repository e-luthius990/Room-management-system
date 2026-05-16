import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getCampOptions } from "@/lib/queries/setup/options";
import { CreateImportForm } from "@/components/imports/create-import-form";

type NewImportPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string): string | null {
  if (!error) return null;

  const messages: Record<string, string> = {
    invalid_input: "Check the import fields and try again.",
    file_required: "Select a CSV file before uploading.",
    csv_only: "Only CSV files are supported in this import flow.",
    file_too_large: "The import file is too large. Maximum size is 20MB.",
    invalid_import_type: "Selected import type is invalid.",
    storage_failed: "The import file could not be stored.",
    access_denied: "You do not have access to create this import.",
    batch_failed: "Import batch could not be created.",
    import_failed: "Import validation failed.",
  };

  return messages[error] ?? "The import could not be created.";
}

export default async function NewImportPage({
  searchParams,
}: NewImportPageProps): Promise<React.JSX.Element> {
  await requirePermission("imports.upload");

  const query = searchParams ? await searchParams : undefined;
  const camps = await getCampOptions();

  const errorMessage = getErrorMessage(query?.error);

  return (
    <div>
      <PageHeader
        title="New Data Import"
        description="Upload a CSV file, validate rows, review errors, then apply valid rooms or guests into operational records."
        actions={
          <Link
            href="/imports"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Back to imports
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
          No accessible camps were found. You need manager access to at least
          one active camp before creating an import.
        </div>
      ) : (
        <CreateImportForm camps={camps} />
      )}
    </div>
  );
}
