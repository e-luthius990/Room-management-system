// src/lib/room-status.ts

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

export type RoomStatusTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "muted";

export type RoomUiStatusMeta = {
  status: RoomUiStatus;
  label: string;
  className: string;
  tone: RoomStatusTone;
};

export type RoomConditionStatus =
  | "excellent"
  | "good"
  | "fair"
  | "needs_attention"
  | "damaged"
  | string;

export const ROOM_UI_STATUS_OPTIONS = [
  { value: "vacant_ready", label: "Vacant ready" },
  { value: "reserved", label: "Reserved" },
  { value: "pending_check_in", label: "Pending check-in" },
  { value: "occupied", label: "Occupied" },
  { value: "pending_checkout", label: "Pending checkout" },
  { value: "out_of_service", label: "Out of service" },
  { value: "manager_hold", label: "Manager hold" },
] as const satisfies readonly {
  value: RoomUiStatus;
  label: string;
}[];

const ROOM_UI_STATUS_SET = new Set<string>(
  ROOM_UI_STATUS_OPTIONS.map((option) => option.value),
);

const ROOM_STATUS_META = {
  vacant_ready: {
    status: "vacant_ready",
    label: "Vacant ready",
    className: "status-vacant-ready",
    tone: "success",
  },
  reserved: {
    status: "reserved",
    label: "Reserved",
    className: "status-reserved",
    tone: "warning",
  },
  pending_check_in: {
    status: "pending_check_in",
    label: "Pending check-in",
    className: "status-pending-check-in",
    tone: "warning",
  },
  occupied: {
    status: "occupied",
    label: "Occupied",
    className: "status-occupied",
    tone: "info",
  },
  pending_checkout: {
    status: "pending_checkout",
    label: "Pending checkout",
    className: "status-pending-checkout",
    tone: "warning",
  },
  out_of_service: {
    status: "out_of_service",
    label: "Out of service",
    className: "status-muted",
    tone: "muted",
  },
  manager_hold: {
    status: "manager_hold",
    label: "Manager hold",
    className: "status-muted",
    tone: "muted",
  },
} as const satisfies Record<RoomUiStatus, RoomUiStatusMeta>;

export function isRoomUiStatus(status: string | null | undefined): status is RoomUiStatus {
  return typeof status === "string" && ROOM_UI_STATUS_SET.has(status);
}

export function getRoomUiStatus(
  status: string | null | undefined,
): RoomUiStatus | null {
  return isRoomUiStatus(status) ? status : null;
}

export function getRoomStatusMeta(
  status: string | null | undefined,
): RoomUiStatusMeta | null {
  const uiStatus = getRoomUiStatus(status);

  if (!uiStatus) {
    return null;
  }

  return ROOM_STATUS_META[uiStatus];
}

export function formatRoomStatus(
  status: string | null | undefined,
): string | null {
  return getRoomStatusMeta(status)?.label ?? null;
}

export function getRoomStatusClass(
  status: string | null | undefined,
): string | null {
  return getRoomStatusMeta(status)?.className ?? null;
}

export function getRoomStatusTone(
  status: string | null | undefined,
): RoomStatusTone | null {
  return getRoomStatusMeta(status)?.tone ?? null;
}

export function isBlockedRoomStatus(
  status: string | null | undefined,
): boolean {
  return status === "out_of_service" || status === "manager_hold";
}

export function formatRoomConditionStatus(
  status: RoomConditionStatus | null | undefined,
): string {
  switch (status) {
    case "excellent":
      return "Excellent";

    case "good":
      return "Good";

    case "fair":
      return "Fair";

    case "needs_attention":
      return "Needs attention";

    case "damaged":
      return "Damaged";

    default:
      return formatFallbackLabel(status);
  }
}

export function getRoomConditionTone(
  status: RoomConditionStatus | null | undefined,
): string {
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

function formatFallbackLabel(value: unknown): string {
  const text = String(value ?? "").trim();

  if (!text) {
    return "—";
  }

  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}