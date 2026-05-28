import { requireAnyPermission } from "@/lib/auth/require-permission";
import { getCampOptions } from "@/lib/queries/setup/options";
import { CreateImportForm } from "@/components/imports/create-import-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type NewImportPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const NEW_IMPORT_PAGE_PERMISSIONS = [
  "data.import",
  "imports.rooms",
  "imports.guests",
  "imports.upload",
] as const;

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
  await requireAnyPermission([...NEW_IMPORT_PAGE_PERMISSIONS]);

  const [query, camps] = await Promise.all([
    searchParams ?? Promise.resolve(undefined),
    getCampOptions(),
  ]);

  const errorMessage = getErrorMessage(query?.error);

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {camps.length === 0 ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-800">
          No accessible camps were found. You need access to at least one active
          camp before creating an import.
        </div>
      ) : (
        <CreateImportForm camps={camps} />
      )}
    </div>
  );
}
