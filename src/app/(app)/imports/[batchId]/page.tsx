import Link from "next/link";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getImportDetail } from "@/lib/queries/imports/get-import-detail";
import {
  formatImportStatus,
  formatImportType,
  importStatusTone,
} from "@/components/imports/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ImportDetailPageProps = {
  params: Promise<{
    batchId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

const IMPORT_DETAIL_PAGE_PERMISSIONS = [
  "data.import",
  "imports.rooms",
  "imports.guests",
  "imports.review",
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
      return "border-sky-200 bg-sky-50 text-sky-700";

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
  await requireAnyPermission([...IMPORT_DETAIL_PAGE_PERMISSIONS]);

  const { batchId } = await params;

  const [query, detail] = await Promise.all([
    searchParams ?? Promise.resolve(undefined),
    getImportDetail(batchId),
  ]);

  const { batch, rows } = detail;

  const successMessage = getSuccessMessage(query?.success);
  const errorMessage = getErrorMessage(query?.error);
  const applyReady = canApplyImport(batch.status, batch.valid_rows);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${formatImportType(batch.import_type)} review`}
        description="Review parsed rows, normalized values, and validation errors before applying valid records."
        actions={
          <Link
            href="/imports"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
          >
            Back to imports
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

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Total rows" value={batch.total_rows} />
        <Metric title="Valid rows" value={batch.valid_rows} />
        <Metric title="Invalid rows" value={batch.invalid_rows} />

        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div>
            <span
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold",
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

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
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
              className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
            >
              Apply valid rows
            </Link>
          ) : null}
        </div>

        <dl className="mt-5 grid gap-5 md:grid-cols-2">
          <DetailItem label="Camp" value={batch.camp_name} />
          <DetailItem
            label="Filename"
            value={batch.original_filename ?? "CSV import"}
          />
          <DetailItem
            label="Created"
            value={formatDateTime(batch.created_at)}
          />
          <DetailItem
            label="Completed"
            value={formatDateTime(batch.completed_at)}
          />

          {batch.failed_at ? (
            <DetailItem
              label="Failed"
              value={formatDateTime(batch.failed_at)}
            />
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

      <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Row validation
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Showing {rows.length} parsed row{rows.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-sm text-neutral-500">
            No import rows found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Row</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Errors</th>
                  <th className="px-4 py-3 font-semibold">
                    Normalized payload
                  </th>
                  <th className="px-4 py-3 font-semibold">Raw payload</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="align-top transition hover:bg-neutral-50/70"
                  >
                    <td className="px-4 py-4 font-semibold text-neutral-950">
                      {row.row_number}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold",
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div>
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="mt-1 font-medium text-neutral-950">{value}</dd>
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
