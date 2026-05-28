"use server";

import "server-only";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import type { CurrentUserContext } from "@/lib/auth/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notifyWorkflowUsers } from "@/lib/notifications/workflow-notifications";
import {
  createReportExportSchema,
  type ExportFormat,
} from "@/lib/validation/reports";
import { buildReportExportFile } from "@/lib/queries/reports/build-report-export-csv";

type CreateExportJobResult =
  | string
  | {
      id: string;
    };

const EXPORT_BUCKET = "exports";

const EXPORT_PERMISSION_BY_FORMAT: Record<ExportFormat, string> = {
  csv: "reports.export_csv",
  xlsx: "reports.export_excel",
  pdf: "reports.export_pdf",
};

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getExportJobId(value: CreateExportJobResult | null): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.id === "string" &&
    value.id.trim().length > 0
  ) {
    return value.id;
  }

  return null;
}

function safeStorageSegment(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function mapExportError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("report type")) {
    return "invalid_report_type";
  }

  if (normalized.includes("format")) {
    return "invalid_export_format";
  }

  if (normalized.includes("date range") || normalized.includes("date")) {
    return "invalid_date_range";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  if (normalized.includes("storage") || normalized.includes("bucket")) {
    return "storage_failed";
  }

  return "export_failed";
}

async function requireExportPermission(
  format: ExportFormat,
): Promise<CurrentUserContext> {
  return requireAnyPermission([
    "data.export",
    "exports.reports",
    EXPORT_PERMISSION_BY_FORMAT[format],
  ]);
}

async function markExportFailed(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  exportJobId: string,
  message: string,
): Promise<void> {
  const { error } = await supabase.rpc("fail_export_job", {
    p_export_job_id: exportJobId,
    p_error_message: message,
  });

  if (error) {
    console.error("Failed to mark export job as failed", {
      exportJobId,
      message: error.message,
    });
  }
}

export async function createReportExportAction(
  formData: FormData,
): Promise<never> {
  const parsed = createReportExportSchema.safeParse({
    reportType: getFormString(formData, "reportType"),
    exportFormat: getFormString(formData, "exportFormat"),
    campId: getFormString(formData, "campId"),
    dateFrom: getFormString(formData, "dateFrom"),
    dateTo: getFormString(formData, "dateTo"),
  });

  if (!parsed.success) {
    redirect("/reports/exports?error=invalid_input");
  }

  const currentUser = await requireExportPermission(parsed.data.exportFormat);

  const supabase = await createServerSupabaseClient();

  const { data: createdJob, error: jobError } = await supabase
    .rpc("create_export_job", {
      p_report_type: parsed.data.reportType,
      p_export_format: parsed.data.exportFormat,
      p_camp_id: parsed.data.campId ?? undefined,
      p_date_from: parsed.data.dateFrom ?? undefined,
      p_date_to: parsed.data.dateTo ?? undefined,
    })
    .returns<CreateExportJobResult>();

  const exportJobId = getExportJobId(createdJob);

  if (jobError || !exportJobId) {
    const code = mapExportError(jobError?.message ?? "export_failed");
    redirect(`/reports/exports?error=${code}`);
  }

  try {
    const exportResult = await buildReportExportFile(parsed.data);

    const storagePath = [
      "reports",
      safeStorageSegment(parsed.data.reportType),
      safeStorageSegment(parsed.data.exportFormat),
      `${exportJobId}-${randomUUID()}-${safeStorageSegment(
        exportResult.filename,
      )}`,
    ].join("/");

    const { error: uploadError } = await supabase.storage
      .from(EXPORT_BUCKET)
      .upload(storagePath, exportResult.body, {
        contentType: exportResult.contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { error: completeError } = await supabase.rpc("complete_export_job", {
      p_export_job_id: exportJobId,
      p_storage_bucket: EXPORT_BUCKET,
      p_storage_path: storagePath,
      p_row_count: exportResult.rowCount,
    });

    if (completeError) {
      throw new Error(completeError.message);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";

    await markExportFailed(supabase, exportJobId, message);
    await notifyWorkflowUsers({
      recipientIds: [currentUser.authUser.id],
      campId: parsed.data.campId ?? null,
      title: "Report export failed",
      body: `Your ${parsed.data.reportType} export could not be completed.`,
      category: "system",
      severity: "urgent",
      actionHref: "/reports/exports",
      entityType: "export_jobs",
      entityId: exportJobId,
    });

    revalidatePath("/reports");
    revalidatePath("/reports/exports");

    redirect(`/reports/exports?error=${mapExportError(message)}`);
  }

  revalidatePath("/reports");
  revalidatePath("/reports/exports");
  revalidatePath(`/reports/exports/${exportJobId}/download`);

  await notifyWorkflowUsers({
    recipientIds: [currentUser.authUser.id],
    campId: parsed.data.campId ?? null,
    title: "Report export ready",
    body: `Your ${parsed.data.reportType} export is ready to download.`,
    category: "system",
    severity: "success",
    actionHref: `/reports/exports/${exportJobId}/download`,
    entityType: "export_jobs",
    entityId: exportJobId,
  });

  redirect(`/reports/exports/${exportJobId}/download`);
}
