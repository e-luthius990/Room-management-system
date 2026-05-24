import Link from "next/link";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getCampOptions } from "@/lib/queries/setup/options";
import { getExportJobs } from "@/lib/queries/reports/get-export-jobs";
import { CreateExportForm } from "@/components/reports/create-export-form";
import {
  canDownloadExport,
  exportStatusTone,
  formatExportFormat,
  formatExportStatus,
  formatReportType,
} from "@/components/reports/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExportsPageProps = {
  searchParams?: Promise<{
    error?: string;
    reportType?: string;
  }>;
};

const EXPORTS_PAGE_PERMISSIONS = [
  "data.export",
  "exports.reports",
  "reports.export_csv",
  "reports.export_excel",
  "reports.export_pdf",
  "reports.view_exports",
] as const;

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatDateRange(
  dateFrom: string | null,
  dateTo: string | null,
): string {
  if (!dateFrom && !dateTo) {
    return "Current snapshot";
  }

  if (dateFrom && dateTo) {
    return `${formatDateTime(dateFrom)} → ${formatDateTime(dateTo)}`;
  }

  if (dateFrom) {
    return `From ${formatDateTime(dateFrom)}`;
  }

  return `Until ${formatDateTime(dateTo)}`;
}

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the export fields and try again.",
    invalid_report_type: "Selected report type is invalid.",
    invalid_export_format: "Selected export format is invalid.",
    invalid_date_range: "The selected date range is invalid.",
    access_denied: "You do not have access to create this export.",
    storage_failed: "The export file could not be stored.",
    export_failed: "Export could not be generated.",
  };

  return messages[error] ?? "Export could not be completed.";
}

export default async function ReportExportsPage({
  searchParams,
}: ExportsPageProps): Promise<React.JSX.Element> {
  await requireAnyPermission([...EXPORTS_PAGE_PERMISSIONS]);

  const [query, camps, jobs] = await Promise.all([
    searchParams,
    getCampOptions(),
    getExportJobs(),
  ]);

  const errorMessage = getErrorMessage(query?.error);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report exports"
        description="Generate private CSV, Excel, and PDF exports for occupancy, rooms, guests, current stays, and exited guests."
        actions={
          <Link
            href="/reports"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
          >
            Reports
          </Link>
        }
      />

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <CreateExportForm camps={camps} />

      <section className="rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">
              Export history
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Showing {jobs.length} active export job
              {jobs.length === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="p-8 text-sm text-neutral-500">
            No export jobs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Report</th>
                  <th className="px-4 py-3 font-semibold">Format</th>
                  <th className="px-4 py-3 font-semibold">Rows</th>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Completed</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100">
                {jobs.map((job) => (
                  <tr
                    key={job.id}
                    className="align-top transition hover:bg-neutral-50/70"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-neutral-950">
                        {formatReportType(job.report_type)}
                      </div>

                      {job.error_message ? (
                        <div className="mt-1 max-w-sm text-xs leading-5 text-red-700">
                          {job.error_message}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {formatExportFormat(job.export_format)}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {job.row_count ?? "—"}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {formatDateRange(job.date_from, job.date_to)}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {formatDateTime(job.created_at)}
                    </td>

                    <td className="px-4 py-4 text-neutral-700">
                      {formatDateTime(job.completed_at)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          exportStatusTone(job.status),
                        ].join(" ")}
                      >
                        {formatExportStatus(job.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      {canDownloadExport(job.status) ? (
                        <Link
                          href={`/reports/exports/${job.id}/download`}
                          className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:border-sky-200 hover:bg-sky-50"
                        >
                          Download
                        </Link>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
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
