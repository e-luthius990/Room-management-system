import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getImportDetail } from "@/lib/queries/imports/get-import-detail";
import {
  formatImportStatus,
  formatImportType,
  importStatusTone,
} from "@/components/imports/status";

type ImportDetailPageProps = {
  params: Promise<{
    batchId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatDateTime(value: string | null): string {
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

function payloadPreview(value: Record<string, unknown>): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function getSuccessMessage(success?: string): string | null {
  const messages: Record<string, string> = {
    import_validated: "Import uploaded and validated successfully.",
    import_applied: "Valid import rows were applied successfully.",
  };

  return success ? (messages[success] ?? null) : null;
}

function getErrorMessage(error?: string): string | null {
  const messages: Record<string, string> = {
    import_failed: "Import validation failed. Review the batch error below.",
    apply_failed: "Import rows could not be applied.",
    batch_not_found: "Import batch was not found.",
    batch_not_ready: "Only completed imports can be applied.",
    already_applied: "This import batch has already been applied.",
    access_denied: "You do not have permission to perform this action.",
  };

  return error
    ? (messages[error] ?? "The request could not be completed.")
    : null;
}

function rowStatusTone(status: string): string {
  switch (status) {
    case "valid":
    case "applied":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "invalid":
    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    case "pending":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

function formatRowStatus(status: string): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function canApplyImport(status: string, validRows: number): boolean {
  return (
    validRows > 0 &&
    (status === "completed" || status === "completed_with_errors")
  );
}

export default async function ImportDetailPage({
  params,
  searchParams,
}: ImportDetailPageProps): Promise<React.JSX.Element> {
  await requirePermission("imports.review");

  const { batchId } = await params;
  const query = searchParams ? await searchParams : undefined;

  const { batch, rows } = await getImportDetail(batchId);

  const successMessage = getSuccessMessage(query?.success);
  const errorMessage = getErrorMessage(query?.error);
  const applyReady = canApplyImport(batch.status, batch.valid_rows);

  return (
    <div>
      <PageHeader
        title={`${formatImportType(batch.import_type)} Review`}
        description="Review parsed rows, normalized values, and validation errors before applying valid records."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/imports"
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Back to imports
            </Link>
          </div>
        }
      />

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Total Rows" value={batch.total_rows} />
        <Metric title="Valid Rows" value={batch.valid_rows} />
        <Metric title="Invalid Rows" value={batch.invalid_rows} />

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div>
            <span
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium",
                importStatusTone(batch.status),
              ].join(" ")}
            >
              {formatImportStatus(batch.status)}
            </span>
          </div>

          <div className="mt-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Status
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-950">
              Batch details
            </h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Validation stores row results first. Applying the import creates
              the real room or guest records.
            </p>
          </div>

          {applyReady ? (
            <Link
              href={`/imports/${batch.id}/apply`}
              className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Apply valid rows
            </Link>
          ) : null}
        </div>

        <dl className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <dt className="text-sm text-neutral-500">Camp</dt>
            <dd className="mt-1 font-medium text-neutral-950">
              {batch.camp_name}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-neutral-500">Filename</dt>
            <dd className="mt-1 font-medium text-neutral-950">
              {batch.original_filename ?? "CSV import"}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-neutral-500">Created</dt>
            <dd className="mt-1 font-medium text-neutral-950">
              {formatDateTime(batch.created_at)}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-neutral-500">Completed</dt>
            <dd className="mt-1 font-medium text-neutral-950">
              {formatDateTime(batch.completed_at)}
            </dd>
          </div>

          {batch.failed_at ? (
            <div>
              <dt className="text-sm text-neutral-500">Failed</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {formatDateTime(batch.failed_at)}
              </dd>
            </div>
          ) : null}

          {batch.storage_path ? (
            <div>
              <dt className="text-sm text-neutral-500">Storage path</dt>
              <dd className="mt-1 break-all font-mono text-xs text-neutral-700">
                {batch.storage_path}
              </dd>
            </div>
          ) : null}

          {batch.error_message ? (
            <div className="md:col-span-2">
              <dt className="text-sm text-neutral-500">Batch error</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-red-700">
                {batch.error_message}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Row</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Errors</th>
                <th className="px-4 py-3">Normalized Payload</th>
                <th className="px-4 py-3">Raw Payload</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    No import rows found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-4 font-medium text-neutral-950">
                      {row.row_number}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          rowStatusTone(row.validation_status),
                        ].join(" ")}
                      >
                        {formatRowStatus(row.validation_status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-red-700">
                      {row.error_messages.length > 0 ? (
                        <ul className="space-y-1">
                          {row.error_messages.map((message, index) => (
                            <li key={`${row.id}-${index}`}>{message}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-xs text-neutral-700">
                      <pre className="max-w-[420px] overflow-x-auto whitespace-pre-wrap rounded-2xl bg-neutral-50 p-3 font-mono leading-5">
                        {payloadPreview(row.normalized_payload)}
                      </pre>
                    </td>

                    <td className="px-4 py-4 text-xs text-neutral-700">
                      <pre className="max-w-[420px] overflow-x-auto whitespace-pre-wrap rounded-2xl bg-neutral-50 p-3 font-mono leading-5">
                        {payloadPreview(row.raw_payload)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: number;
}): React.JSX.Element {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-2xl font-semibold text-neutral-950">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </div>
    </div>
  );
}
