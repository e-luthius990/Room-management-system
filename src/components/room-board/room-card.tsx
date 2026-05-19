// src/components/room-board/room-card.tsx

import type { JSX } from "react";
import Link from "next/link";
import { BedDouble, CalendarClock, Crown, Eye, UserRound } from "lucide-react";
import type { RoomBoardItem } from "@/lib/queries/room-board/get-room-board";
import { APP_ROUTES } from "@/lib/auth/routes";
import { AutoStatusIndicator } from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";

type RoomCardProps = {
  room: RoomBoardItem;
  className?: string;
};

type OperationalStatus = {
  label: string;
  statusClassName: string;
};

const UNAVAILABLE_STATUSES = new Set<string>([
  "out_of_service",
  "manager_hold",
  "under_maintenance",
]);

function formatLabel(value: unknown): string {
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

function formatRoomStatus(status: string): OperationalStatus {
  switch (status) {
    case "vacant_ready":
      return {
        label: "Vacant ready",
        statusClassName: "status-vacant-ready",
      };

    case "reserved":
      return {
        label: "Reserved",
        statusClassName: "status-reserved",
      };

    case "pending_check_in":
      return {
        label: "Pending check-in",
        statusClassName: "status-pending-check-in",
      };

    case "occupied":
      return {
        label: "Occupied",
        statusClassName: "status-occupied",
      };

    case "pending_checkout":
      return {
        label: "Pending checkout",
        statusClassName: "status-pending-checkout",
      };

    case "out_of_service":
    case "manager_hold":
    case "under_maintenance":
      return {
        label: "Unavailable",
        statusClassName: "status-muted",
      };

    default:
      return {
        label: formatLabel(status),
        statusClassName: "status-muted",
      };
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

function getRoomDetailHref(roomId: string): string {
  return APP_ROUTES.rooms.detail(roomId);
}

function getRoomTitle(room: RoomBoardItem): string {
  return room.room_number?.trim() || "Unnamed room";
}

function getBuildingLabel(room: RoomBoardItem): string {
  return room.building_name?.trim() || "No building assigned";
}

function getRoomContext(room: RoomBoardItem): string {
  return [room.camp_name, room.room_type].filter(Boolean).join(" · ");
}

function isUnavailable(room: RoomBoardItem): boolean {
  return UNAVAILABLE_STATUSES.has(room.current_status);
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number | null | undefined;
  icon?: JSX.Element;
}): JSX.Element {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        {icon ? <span className="shrink-0">{icon}</span> : null}
        <span>{label}</span>
      </div>

      <p className="mt-1 truncate text-sm font-semibold text-foreground">
        {value ?? "—"}
      </p>
    </div>
  );
}

export function RoomCard({ room, className }: RoomCardProps): JSX.Element {
  const status = formatRoomStatus(room.current_status);
  const unavailable = isUnavailable(room);
  const hasGuest = Boolean(room.current_guest_name);

  return (
    <article
      className={cn("room-card", unavailable && "opacity-90", className)}
      data-room-id={room.room_id}
      data-room-status={room.current_status}
    >
      <div className="room-card-header">
        <div className="min-w-0">
          <p className="room-card-subtitle">{getBuildingLabel(room)}</p>

          <h3 className="room-card-title">Room {getRoomTitle(room)}</h3>

          <p className="room-card-subtitle">{getRoomContext(room)}</p>
        </div>

        <span
          className={cn(
            "status-indicator max-w-[11rem] shrink-0",
            status.statusClassName,
          )}
          title={status.label}
        >
          <span className="status-dot" aria-hidden="true" />
          <span className="min-w-0 truncate">{status.label}</span>
        </span>
      </div>

      <div className="room-card-body">
        <div className="grid grid-cols-2 gap-3">
          <Info
            label="Type"
            value={room.room_type || "Not set"}
            icon={<BedDouble className="size-3.5" aria-hidden="true" />}
          />

          <Info label="Capacity" value={room.capacity} />

          <Info label="Condition" value={formatLabel(room.condition_status)} />

          <Info
            label="Guest"
            value={room.current_guest_name || "No active guest"}
            icon={<UserRound className="size-3.5" aria-hidden="true" />}
          />
        </div>

        {room.expected_departure_at ? (
          <div className="muted-panel mt-4 px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted" aria-hidden="true" />
              <p className="text-xs font-medium text-muted">
                Expected departure
              </p>
            </div>

            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatDateTime(room.expected_departure_at)}
            </p>
          </div>
        ) : null}

        {room.is_vip || room.is_delegate_suitable || unavailable ? (
          <div className="room-alert-row">
            {room.is_vip ? (
              <span className="status-indicator status-reserved">
                <Crown className="size-3.5" aria-hidden="true" />
                VIP
              </span>
            ) : null}

            {room.is_delegate_suitable ? (
              <span className="status-indicator status-occupied">
                <span className="status-dot" aria-hidden="true" />
                Delegate suitable
              </span>
            ) : null}

            {unavailable ? (
              <span className="status-indicator status-muted">
                <span className="status-dot" aria-hidden="true" />
                Not allocatable
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="room-card-actions">
        <div className="min-w-0">
          <AutoStatusIndicator
            status={hasGuest ? "occupied" : room.current_status}
            label={hasGuest ? "Guest assigned" : undefined}
            withDot
          />
        </div>

        <Link
          href={getRoomDetailHref(room.room_id)}
          className="room-secondary-action"
        >
          <Eye className="size-4" aria-hidden="true" />
          View room
        </Link>
      </div>
    </article>
  );
}
