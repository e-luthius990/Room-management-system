export type RoomStatus =
  | "vacant_ready"
  | "reserved"
  | "pending_check_in"
  | "occupied"
  | "pending_checkout"
  | "needs_cleaning"
  | "cleaning_in_progress"
  | "inspection_needed"
  | "under_maintenance"
  | "out_of_service"
  | "manager_hold";

export type RoomUiStatus =
  | "vacant_ready"
  | "reserved"
  | "pending_check_in"
  | "occupied"
  | "pending_checkout"
  | "out_of_service"
  | "manager_hold";

const HIDDEN_MODULE_STATUSES: readonly RoomStatus[] = [
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
  "under_maintenance",
];

export function isHiddenRoomStatus(status: string): boolean {
  return HIDDEN_MODULE_STATUSES.includes(status as RoomStatus);
}

export function getRoomUiStatus(status: string): RoomUiStatus | null {
  if (isHiddenRoomStatus(status)) {
    return null;
  }

  switch (status) {
    case "vacant_ready":
    case "reserved":
    case "pending_check_in":
    case "occupied":
    case "pending_checkout":
    case "out_of_service":
    case "manager_hold":
      return status;

    default:
      return null;
  }
}

export function formatRoomStatus(status: string): string | null {
  const uiStatus = getRoomUiStatus(status);

  if (!uiStatus) {
    return null;
  }

  const labels: Record<RoomUiStatus, string> = {
    vacant_ready: "Vacant Ready",
    reserved: "Reserved",
    pending_check_in: "Pending Check-in",
    occupied: "Occupied",
    pending_checkout: "Pending Checkout",
    out_of_service: "Out of Service",
    manager_hold: "Manager Hold",
  };

  return labels[uiStatus];
}

export function getRoomStatusClass(status: string): string | null {
  const uiStatus = getRoomUiStatus(status);

  if (!uiStatus) {
    return null;
  }

  switch (uiStatus) {
    case "vacant_ready":
      return "status-vacant-ready";

    case "occupied":
      return "status-occupied";

    case "reserved":
    case "pending_check_in":
    case "pending_checkout":
      return "status-reserved";

    case "out_of_service":
    case "manager_hold":
      return "status-muted";

    default:
      return "status-muted";
  }
}

export function formatRoomConditionStatus(status: string): string {
  const labels: Record<string, string> = {
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    needs_attention: "Needs Attention",
    damaged: "Damaged",
  };

  return labels[status] ?? formatFallbackLabel(status);
}

export function getRoomConditionTone(status: string): string {
  switch (status) {
    case "excellent":
      return "text-success-700";

    case "good":
      return "text-foreground";

    case "fair":
      return "text-warning-700";

    case "needs_attention":
    case "damaged":
      return "text-danger-700";

    default:
      return "text-muted";
  }
}

function formatFallbackLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}