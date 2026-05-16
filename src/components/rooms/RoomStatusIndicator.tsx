import { StatusIndicator } from "@/components/ui/StatusIndicator";

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

type VisibleRoomStatus =
  | "vacant_ready"
  | "reserved"
  | "pending_check_in"
  | "occupied"
  | "pending_checkout"
  | "out_of_service"
  | "manager_hold";

type RoomStatusMeta = {
  label: string;
  className: string;
};

const hiddenRoomStatuses = new Set<RoomStatus>([
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
  "under_maintenance",
]);

const roomStatusMeta: Record<VisibleRoomStatus, RoomStatusMeta> = {
  vacant_ready: {
    label: "Vacant ready",
    className: "status-vacant-ready",
  },
  reserved: {
    label: "Reserved",
    className: "status-reserved",
  },
  pending_check_in: {
    label: "Pending check-in",
    className: "status-pending-check-in",
  },
  occupied: {
    label: "Occupied",
    className: "status-occupied",
  },
  pending_checkout: {
    label: "Pending checkout",
    className: "status-pending-checkout",
  },
  out_of_service: {
    label: "Out of service",
    className: "status-muted",
  },
  manager_hold: {
    label: "Manager hold",
    className: "status-muted",
  },
};

function isRoomStatus(status: string): status is RoomStatus {
  return (
    status === "vacant_ready" ||
    status === "reserved" ||
    status === "pending_check_in" ||
    status === "occupied" ||
    status === "pending_checkout" ||
    status === "needs_cleaning" ||
    status === "cleaning_in_progress" ||
    status === "inspection_needed" ||
    status === "under_maintenance" ||
    status === "out_of_service" ||
    status === "manager_hold"
  );
}

function isVisibleRoomStatus(status: string): status is VisibleRoomStatus {
  return (
    status === "vacant_ready" ||
    status === "reserved" ||
    status === "pending_check_in" ||
    status === "occupied" ||
    status === "pending_checkout" ||
    status === "out_of_service" ||
    status === "manager_hold"
  );
}

function fallbackLabel(status: string): string {
  return status
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getRoomStatusMeta(status: string): RoomStatusMeta | null {
  if (isRoomStatus(status) && hiddenRoomStatuses.has(status)) {
    return null;
  }

  if (isVisibleRoomStatus(status)) {
    return roomStatusMeta[status];
  }

  return {
    label: fallbackLabel(status),
    className: "status-muted",
  };
}

export function RoomStatusIndicator({
  status,
  className,
}: {
  status: string;
  className?: string;
}): React.JSX.Element | null {
  const meta = getRoomStatusMeta(status);

  if (!meta) {
    return null;
  }

  return (
    <StatusIndicator
      label={meta.label}
      statusClassName={meta.className}
      className={className}
    />
  );
}
