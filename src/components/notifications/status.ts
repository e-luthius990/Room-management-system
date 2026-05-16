import {
  notificationCategoryLabels,
  notificationSeverityLabels,
  type NotificationCategory,
  type NotificationSeverity,
} from "@/lib/validation/notifications";

function formatFallbackLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeNotificationCategory(
  category: string | null,
): NotificationCategory | null {
  if (
    category === "general" ||
    category === "reservation" ||
    category === "stay" ||
    category === "housekeeping" ||
    category === "maintenance" ||
    category === "room_service" ||
    category === "security" ||
    category === "guest_documents" ||
    category === "keys" ||
    category === "system"
  ) {
    return category;
  }

  return null;
}

function normalizeNotificationSeverity(
  severity: string | null,
): NotificationSeverity | null {
  if (
    severity === "info" ||
    severity === "success" ||
    severity === "warning" ||
    severity === "urgent"
  ) {
    return severity;
  }

  return null;
}

export function formatNotificationCategory(category: string | null): string {
  const normalized = normalizeNotificationCategory(category);

  if (normalized) {
    return notificationCategoryLabels[normalized];
  }

  if (!category) {
    return notificationCategoryLabels.general;
  }

  return formatFallbackLabel(category);
}

export function formatNotificationSeverity(severity: string | null): string {
  const normalized = normalizeNotificationSeverity(severity);

  if (normalized) {
    return notificationSeverityLabels[normalized];
  }

  if (!severity) {
    return notificationSeverityLabels.info;
  }

  return formatFallbackLabel(severity);
}

export function notificationSeverityTone(severity: string | null): string {
  switch (normalizeNotificationSeverity(severity) ?? "info") {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "urgent":
      return "border-red-200 bg-red-50 text-red-700";

    case "info":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}