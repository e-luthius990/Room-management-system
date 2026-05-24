import type { Enums } from "@/lib/db/types";
import type { ExportFormat, ReportType } from "@/lib/validation/reports";

type ExportStatus = Enums<"export_status">;

function formatFallbackLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatReportType(type: string): string {
  const labels: Record<ReportType, string> = {
    occupancy: "Occupancy",
    guests: "Guests",
    rooms: "Rooms",
    current_stays: "Current stays",
    exited_guests: "Exited guests",
  };

  return labels[type as ReportType] ?? formatFallbackLabel(type);
}

export function formatExportFormat(format: string): string {
  const labels: Record<ExportFormat, string> = {
    csv: "CSV",
    xlsx: "Excel",
    pdf: "PDF",
  };

  return labels[format as ExportFormat] ?? formatFallbackLabel(format);
}

export function formatExportStatus(status: string): string {
  const labels: Record<ExportStatus, string> = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    expired: "Expired",
  };

  return labels[status as ExportStatus] ?? formatFallbackLabel(status);
}

export function exportStatusTone(status: string): string {
  switch (status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "pending":
    case "processing":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    case "expired":
      return "border-neutral-300 bg-neutral-100 text-neutral-600";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

export function canDownloadExport(status: string): boolean {
  return status === "completed";
}