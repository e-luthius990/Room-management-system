import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCompletedExportJob } from "@/lib/queries/reports/get-export-jobs";

type ExportDownloadRouteProps = {
  params: Promise<{
    exportJobId: string;
  }>;
};

const EXPORT_PERMISSION_BY_FORMAT: Record<string, string> = {
  csv: "reports.export_csv",
  xlsx: "reports.export_excel",
  pdf: "reports.export_pdf",
};

function safeFilenameSegment(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function normalizeExportFormat(value: string): "csv" | "xlsx" | "pdf" {
  const normalized = value.trim().toLowerCase();

  if (normalized === "xlsx" || normalized === "pdf") {
    return normalized;
  }

  return "csv";
}

function buildDownloadFilename(job: {
  id: string;
  report_type: string;
  export_format: string;
}): string {
  const format = normalizeExportFormat(job.export_format);
  const reportType = safeFilenameSegment(job.report_type || "report");

  return `${reportType}-${job.id}.${format}`;
}

export async function GET(
  request: Request,
  { params }: ExportDownloadRouteProps,
): Promise<NextResponse> {
  await requireAnyPermission([
    "reports.view_exports",
    "exports.reports",
    "reports.export_csv",
    "reports.export_excel",
    "reports.export_pdf",
  ]);

  const { exportJobId } = await params;
  const job = await getCompletedExportJob(exportJobId);
  const exportFormat = normalizeExportFormat(job.export_format);

  await requireAnyPermission([
    "reports.view_exports",
    "exports.reports",
    EXPORT_PERMISSION_BY_FORMAT[exportFormat],
  ]);

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.storage
    .from(job.storage_bucket)
    .createSignedUrl(job.storage_path, 60, {
      download: buildDownloadFilename(job),
    });

  if (error || !data?.signedUrl) {
    return NextResponse.redirect(
      new URL("/reports/exports?error=download_failed", request.url),
    );
  }

  return NextResponse.redirect(data.signedUrl);
}