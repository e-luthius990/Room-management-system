import type { RoomBoardItem } from "@/lib/queries/room-board/get-room-board";

type RoomCardProps = {
  room: RoomBoardItem;
};

const HIDDEN_ROOM_STATUSES = new Set([
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
  "under_maintenance",
]);

function formatLabel(value: unknown): string {
  const text = String(value ?? "").trim();

  if (!text) {
    return "—";
  }

  return text
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRoomStatus(status: string): string | null {
  if (HIDDEN_ROOM_STATUSES.has(status)) {
    return null;
  }

  switch (status) {
    case "vacant_ready":
      return "Vacant ready";

    case "reserved":
      return "Reserved";

    case "pending_check_in":
      return "Pending check-in";

    case "occupied":
      return "Occupied";

    case "pending_checkout":
      return "Pending checkout";

    case "out_of_service":
      return "Out of service";

    case "manager_hold":
      return "Manager hold";

    default:
      return formatLabel(status);
  }
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
      return "status-muted";
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function RoomCard({ room }: RoomCardProps): React.JSX.Element {
  const roomStatusLabel = formatRoomStatus(room.current_status);
  const roomStatusClass = getRoomStatusClass(room.current_status);
  const showRoomStatus = Boolean(roomStatusLabel && roomStatusClass);

  return (
    <article className="room-card">
      <div className="room-card-header">
        <div className="min-w-0">
          <p className="room-card-subtitle">
            {room.building_name ? room.building_name : "No building assigned"}
          </p>

          <h3 className="room-card-title">Room {room.room_number}</h3>

          <p className="room-card-subtitle">
            {room.camp_name}
            {room.room_type ? ` · ${room.room_type}` : ""}
          </p>
        </div>

        {showRoomStatus ? (
          <span className={`status-indicator shrink-0 ${roomStatusClass}`}>
            <span className="status-dot" aria-hidden="true" />
            {roomStatusLabel}
          </span>
        ) : null}
      </div>

      <div className="room-card-body">
        <div className="grid grid-cols-2 gap-3">
          <Info label="Type" value={room.room_type} />
          <Info label="Capacity" value={room.capacity} />
          <Info label="Condition" value={formatLabel(room.condition_status)} />
          <Info
            label="Guest"
            value={room.current_guest_name ?? "No active guest"}
          />
        </div>

        {room.expected_departure_at ? (
          <div className="muted-panel mt-4 px-4 py-3">
            <p className="text-xs text-muted">Expected departure</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatDateTime(room.expected_departure_at)}
            </p>
          </div>
        ) : null}

        {room.is_vip || room.is_delegate_suitable ? (
          <div className="room-alert-row">
            {room.is_vip ? (
              <span className="status-indicator status-reserved">
                <span className="status-dot" aria-hidden="true" />
                VIP
              </span>
            ) : null}

            {room.is_delegate_suitable ? (
              <span className="status-indicator status-occupied">
                <span className="status-dot" aria-hidden="true" />
                Delegate suitable
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {value ?? "—"}
      </p>
    </div>
  );
}
