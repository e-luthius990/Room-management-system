import { NextResponse } from "next/server";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCompletedExportJob } from "@/lib/queries/reports/get-export-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExportDownloadRouteProps = {
  params: Promise<{
    exportJobId: string;
  }>;
};

const EXPORT_PERMISSION_BY_FORMAT = {
  csv: "reports.export_csv",
  xlsx: "reports.export_excel",
  pdf: "reports.export_pdf",
} as const;

type SupportedExportFormat = keyof typeof EXPORT_PERMISSION_BY_FORMAT;

function safeFilenameSegment(value: string): string {
  const normalized = value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return normalized.length > 0 ? normalized : "report";
}

function normalizeExportFormat(value: string): SupportedExportFormat {
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
  const reportType = safeFilenameSegment(job.report_type);

  return `${reportType}-${job.id}.${format}`;
}

function redirectToExports(request: Request, error: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/reports/exports?error=${encodeURIComponent(error)}`, request.url),
  );
}

export async function GET(
  request: Request,
  { params }: ExportDownloadRouteProps,
): Promise<NextResponse> {
  const { exportJobId } = await params;

  await requireAnyPermission([
    "data.export",
    "reports.view_exports",
    "exports.reports",
  ]);

  const job = await getCompletedExportJob(exportJobId);
  const exportFormat = normalizeExportFormat(job.export_format);

  await requireAnyPermission([
    "data.export",
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
    return redirectToExports(request, "download_failed");
  }

  return NextResponse.redirect(data.signedUrl);
}