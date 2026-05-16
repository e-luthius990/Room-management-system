import "server-only";

import { notFound } from "next/navigation";
import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ExportStatus = Enums<"export_status">;

export type ExportJobListItem = {
  id: string;
  camp_id: string | null;
  report_type: string;
  export_type: string;
  export_format: string;
  format: string;
  status: ExportStatus;
  storage_bucket: string | null;
  storage_path: string | null;
  row_count: number | null;
  error_message: string | null;
  date_from: string | null;
  date_to: string | null;
  requested_by: string | null;
  created_by: string | null;
  expires_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export type CompletedExportJob = {
  id: string;
  status: ExportStatus;
  storage_bucket: string;
  storage_path: string;
  report_type: string;
  export_type: string;
  export_format: string;
  format: string;
  camp_id: string | null;
  row_count: number | null;
  completed_at: string | null;
};

type ExportJobRow = {
  id: string;
  camp_id: string | null;
  report_type: string | null;
  export_type: string | null;
  export_format: string | null;
  format: string | null;
  status: ExportStatus;
  storage_bucket: string | null;
  storage_path: string | null;
  row_count: number | string | null;
  error_message: string | null;
  date_from: string | null;
  date_to: string | null;
  requested_by: string | null;
  created_by: string | null;
  expires_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CompletedExportJobRow = {
  id: string;
  status: ExportStatus;
  storage_bucket: string | null;
  storage_path: string | null;
  report_type: string | null;
  export_type: string | null;
  export_format: string | null;
  format: string | null;
  camp_id: string | null;
  row_count: number | string | null;
  completed_at: string | null;
};

function toNumberOrNull(value: number | string | null): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeText(value: string | null, fallback: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

function normalizeReportType(row: {
  report_type: string | null;
  export_type: string | null;
}): string {
  return normalizeText(
    row.report_type,
    normalizeText(row.export_type, "unknown_report"),
  );
}

function normalizeExportType(row: {
  report_type: string | null;
  export_type: string | null;
}): string {
  return normalizeText(
    row.export_type,
    normalizeText(row.report_type, "unknown_report"),
  );
}

function normalizeFormat(row: {
  export_format: string | null;
  format: string | null;
}): string {
  return normalizeText(row.format, normalizeText(row.export_format, "csv"));
}

function normalizeExportFormat(row: {
  export_format: string | null;
  format: string | null;
}): string {
  return normalizeText(row.export_format, normalizeText(row.format, "csv"));
}

export async function getExportJobs(): Promise<ExportJobListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("export_jobs")
    .select(
      [
        "id",
        "camp_id",
        "report_type",
        "export_type",
        "export_format",
        "format",
        "status",
        "storage_bucket",
        "storage_path",
        "row_count",
        "error_message",
        "date_from",
        "date_to",
        "requested_by",
        "created_by",
        "expires_at",
        "completed_at",
        "failed_at",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<ExportJobRow[]>();

  if (error) {
    throw new Error(`Failed to load export jobs: ${error.message}`);
  }

  return (data ?? []).map((job) => ({
    id: job.id,
    camp_id: job.camp_id,
    report_type: normalizeReportType(job),
    export_type: normalizeExportType(job),
    export_format: normalizeExportFormat(job),
    format: normalizeFormat(job),
    status: job.status,
    storage_bucket: job.storage_bucket,
    storage_path: job.storage_path,
    row_count: toNumberOrNull(job.row_count),
    error_message: job.error_message,
    date_from: job.date_from,
    date_to: job.date_to,
    requested_by: job.requested_by,
    created_by: job.created_by,
    expires_at: job.expires_at,
    completed_at: job.completed_at,
    failed_at: job.failed_at,
    created_at: job.created_at ?? new Date(0).toISOString(),
    updated_at: job.updated_at,
  }));
}

export async function getCompletedExportJob(
  exportJobId: string,
): Promise<CompletedExportJob> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("export_jobs")
    .select(
      [
        "id",
        "status",
        "storage_bucket",
        "storage_path",
        "report_type",
        "export_type",
        "export_format",
        "format",
        "camp_id",
        "row_count",
        "completed_at",
      ].join(","),
    )
    .eq("id", exportJobId)
    .is("archived_at", null)
    .returns<CompletedExportJobRow[]>()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load export job: ${error.message}`);
  }

  if (
    !data ||
    data.status !== "completed" ||
    data.storage_bucket !== "exports" ||
    !data.storage_path
  ) {
    notFound();
  }

  return {
    id: data.id,
    status: data.status,
    storage_bucket: data.storage_bucket,
    storage_path: data.storage_path,
    report_type: normalizeReportType(data),
    export_type: normalizeExportType(data),
    export_format: normalizeExportFormat(data),
    format: normalizeFormat(data),
    camp_id: data.camp_id,
    row_count: toNumberOrNull(data.row_count),
    completed_at: data.completed_at,
  };
}