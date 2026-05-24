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
            className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
          >
            New import
          </Link>
        }
      />

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Import history
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Showing {batches.length} import batch
              {batches.length === 1 ? "" : "es"}.
            </p>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="p-8 text-sm text-neutral-500">
            No import batches found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Import</th>
                  <th className="px-4 py-3 font-semibold">Camp</th>
                  <th className="px-4 py-3 font-semibold">Rows</th>
                  <th className="px-4 py-3 font-semibold">Errors</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="align-top transition hover:bg-neutral-50/70"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-neutral-950">
                        {formatImportType(batch.import_type)}
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {batch.original_filename ?? "CSV import"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {batch.camp_name}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      <div>
                        {batch.valid_rows} valid / {batch.total_rows} total
                      </div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {batch.invalid_rows} invalid
                      </div>
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {batch.invalid_rows}
                      {batch.error_message ? (
                        <div className="mt-1 max-w-[260px] text-xs leading-5 text-red-700">
                          {batch.error_message}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {formatDateTime(batch.created_at)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          importStatusTone(batch.status),
                        ].join(" ")}
                      >
                        {formatImportStatus(batch.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/imports/${batch.id}`}
                        className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:border-sky-200 hover:bg-sky-50"
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
