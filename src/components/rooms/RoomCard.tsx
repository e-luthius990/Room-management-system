import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type RoomCardRoom = {
  id: string;
  room_number: string;
  building_name: string | null;
  room_type: string | null;
  capacity: number | null;
  current_status: string;
  condition_status?: string | null;
  current_guest_name?: string | null;
  expected_departure_at?: string | null;
  is_vip?: boolean | null;
  is_delegate_suitable?: boolean | null;
};

type RoomCardProps = {
  room: RoomCardRoom;
  href?: string;
  className?: string;
};

const HIDDEN_ROOM_STATUSES = new Set([
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
  "under_maintenance",
]);

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatText(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getRoomStatusLabel(status: string): string | null {
  if (HIDDEN_ROOM_STATUSES.has(status)) {
    return null;
  }

  const labels: Record<string, string> = {
    vacant_ready: "Vacant ready",
    reserved: "Reserved",
    pending_check_in: "Pending check-in",
    occupied: "Occupied",
    pending_checkout: "Pending checkout",
    out_of_service: "Out of service",
    manager_hold: "Manager hold",
  };

  return labels[status] ?? null;
}

function getRoomStatusClass(status: string): string | null {
  if (HIDDEN_ROOM_STATUSES.has(status)) {
    return null;
  }

  switch (status) {
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
      return null;
  }
}

function RoomStatusBadge({
  status,
}: {
  status: string;
}): React.JSX.Element | null {
  const label = getRoomStatusLabel(status);
  const className = getRoomStatusClass(status);

  if (!label || !className) {
    return null;
  }

  return (
    <span className={cn("status-indicator shrink-0", className)}>
      <span className="status-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

function RoomInfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="max-w-[60%] truncate text-right font-medium text-foreground">
        {value ?? "—"}
      </span>
    </div>
  );
}

function RoomCardBody({ room }: { room: RoomCardRoom }): React.JSX.Element {
  const departureLabel = formatDateTime(room.expected_departure_at);

  return (
    <div className="surface-card overflow-hidden">
      <div className="border-b border-border bg-surface-2/70 px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold tracking-[-0.025em] text-foreground">
              Room {room.room_number}
            </h3>

            <p className="mt-1 truncate text-xs text-muted">
              {room.building_name ?? "No building"}
            </p>
          </div>

          <RoomStatusBadge status={room.current_status} />
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 text-sm">
          <RoomInfoRow label="Type" value={room.room_type ?? "Not set"} />
          <RoomInfoRow label="Capacity" value={room.capacity ?? "—"} />
          <RoomInfoRow
            label="Condition"
            value={formatText(room.condition_status)}
          />
          <RoomInfoRow
            label="Guest"
            value={room.current_guest_name ?? "No active guest"}
          />
          <RoomInfoRow label="Departure" value={departureLabel ?? "—"} />
        </div>

        {room.is_vip || room.is_delegate_suitable ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {room.is_vip ? (
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                VIP
              </span>
            ) : null}

            {room.is_delegate_suitable ? (
              <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted">
                Delegate suitable
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RoomCard({
  room,
  href,
  className,
}: RoomCardProps): React.JSX.Element {
  if (!href) {
    return (
      <div className={className}>
        <RoomCardBody room={room} />
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        className,
      )}
    >
      <RoomCardBody room={room} />
    </Link>
  );
}
