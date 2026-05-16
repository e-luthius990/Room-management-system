export type ImportType = "rooms_csv" | "guests_csv";

export type ImportBatchStatus =
  | "pending"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

export type ImportRowStatus =
  | "pending"
  | "valid"
  | "invalid"
  | "applied"
  | "failed";

export function formatImportType(type: string): string {
  const labels: Record<ImportType, string> = {
    rooms_csv: "Rooms CSV",
    guests_csv: "Guests CSV",
  };

  return labels[type as ImportType] ?? formatFallbackLabel(type);
}

export function formatImportStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    completed_with_errors: "Completed with Errors",
    failed: "Failed",
    cancelled: "Cancelled",

    valid: "Valid",
    invalid: "Invalid",
    applied: "Applied",
  };

  return labels[status] ?? formatFallbackLabel(status);
}

export function importStatusTone(status: string): string {
  switch (status) {
    case "completed":
    case "valid":
    case "applied":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "completed_with_errors":
    case "invalid":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "processing":
    case "pending":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "failed":
      return "border-red-200 bg-red-50 text-red-700";

    case "cancelled":
      return "border-neutral-300 bg-neutral-100 text-neutral-700";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

function formatFallbackLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}