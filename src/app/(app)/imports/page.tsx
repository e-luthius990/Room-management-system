import Link from "next/link";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getImportBatches } from "@/lib/queries/imports/get-import-batches";
import {
  formatImportStatus,
  formatImportType,
  importStatusTone,
} from "@/components/imports/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ImportsPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

const IMPORTS_PAGE_PERMISSIONS = [
  "data.import",
  "imports.rooms",
  "imports.guests",
  "imports.view",
] as const;

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function getSuccessMessage(success?: string): string | null {
  const messages: Record<string, string> = {
    import_validated: "Import file validated successfully.",
    import_applied: "Valid import rows were applied successfully.",
  };

  return success ? (messages[success] ?? null) : null;
}

function getErrorMessage(error?: string): string | null {
  const messages: Record<string, string> = {
    invalid_input: "Check the import form and try again.",
    invalid_import_type: "Invalid import type selected.",
    csv_only: "Only CSV files are supported.",
    file_too_large: "The import file is too large.",
    storage_failed: "The file could not be uploaded.",
    batch_failed: "The import batch could not be created.",
    import_failed: "The import could not be processed.",
    apply_failed: "The import could not be applied.",
    access_denied: "You do not have permission to perform that action.",
  };

  return error
    ? (messages[error] ?? "The request could not be completed.")
    : null;
}

export default async function ImportsPage({
  searchParams,
}: ImportsPageProps): Promise<React.JSX.Element> {
  await requireAnyPermission([...IMPORTS_PAGE_PERMISSIONS]);

  const [params, batches] = await Promise.all([
    searchParams ?? Promise.resolve(undefined),
    getImportBatches(),
  ]);

  const successMessage = getSuccessMessage(params?.success);
  const errorMessage = getErrorMessage(params?.error);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data imports"
        description="Upload, validate, review, and apply bulk room or guest CSV imports to operational records."
        actions={
          <Link
            href="/imports/new"
            className="btn-primary"
          >
            New import
          </Link>
        }
      />

      {successMessage ? (
        <div className="border border-success-600/25 bg-success-50 px-4 py-3 text-sm font-medium text-success-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="table-shell">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-2 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Import history
            </h2>
            <p className="mt-1 text-xs text-muted">
              Showing {batches.length} import batch
              {batches.length === 1 ? "" : "es"}.
            </p>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="p-8 text-sm text-muted">
            No import batches found.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table min-w-[1050px]">
              <thead>
                <tr>
                  <th>Import</th>
                  <th>Camp</th>
                  <th>Rows</th>
                  <th>Errors</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="align-top">
                    <td>
                      <div className="font-semibold text-foreground">
                        {formatImportType(batch.import_type)}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {batch.original_filename ?? "CSV import"}
                      </div>
                    </td>

                    <td className="text-foreground">
                      {batch.camp_name}
                    </td>

                    <td className="text-foreground">
                      <div>
                        {batch.valid_rows} valid / {batch.total_rows} total
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {batch.invalid_rows} invalid
                      </div>
                    </td>

                    <td className="text-foreground">
                      {batch.invalid_rows}
                      {batch.error_message ? (
                        <div className="mt-1 max-w-[260px] text-xs leading-5 text-danger-700">
                          {batch.error_message}
                        </div>
                      ) : null}
                    </td>

                    <td className="text-foreground">
                      {formatDateTime(batch.created_at)}
                    </td>

                    <td>
                      <span
                        className={[
                          "border px-2.5 py-1 text-xs font-semibold",
                          importStatusTone(batch.status),
                        ].join(" ")}
                      >
                        {formatImportStatus(batch.status)}
                      </span>
                    </td>

                    <td className="text-right">
                      <Link
                        href={`/imports/${batch.id}`}
                        className="btn-secondary btn-sm"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
