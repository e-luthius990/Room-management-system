// src/components/room-board/room-card.tsx

import type { JSX } from "react";
import Link from "next/link";
import { CalendarClock, Crown, Eye, MapPin } from "lucide-react";
import type { RoomBoardItem } from "@/lib/queries/room-board/get-room-board";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { APP_ROUTES } from "@/lib/auth/routes";
import {
  AutoStatusIndicator,
  StatusIndicator,
} from "@/components/ui/StatusIndicator";
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
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRoomStatus(status: string): OperationalStatus {
  switch (status) {
    case "vacant_ready":
      return {
        label: "Vacant Ready",
        statusClassName: "status-vacant-ready",
      };

    case "reserved":
      return {
        label: "Reserved",
        statusClassName: "status-reserved",
      };

    case "pending_check_in":
      return {
        label: "Pending Check-in",
        statusClassName: "status-pending-check-in",
      };

    case "occupied":
      return {
        label: "Occupied",
        statusClassName: "status-occupied",
      };

    case "pending_checkout":
      return {
        label: "Pending Checkout",
        statusClassName: "status-pending-checkout",
      };

    case "out_of_service":
    case "manager_hold":
    case "under_maintenance":
      return {
        label: "Unavailable",
        statusClassName: "status-under-maintenance",
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
    timeZone: "Africa/Kampala",
  }).format(date);
}

function getRoomDetailHref(roomId: string): string {
  return APP_ROUTES.rooms.detail(roomId);
}

function getRoomTitle(room: RoomBoardItem): string {
  return room.room_number?.trim() || "Unnamed";
}

function getBuildingLabel(room: RoomBoardItem): string {
  return room.building_name?.trim() || "No building assigned";
}

function getRoomTypeLabel(room: RoomBoardItem): string {
  return room.room_type?.trim() || "Room type not set";
}

function getCampLabel(room: RoomBoardItem): string {
  return room.camp_name?.trim() || "No camp assigned";
}

function isUnavailable(room: RoomBoardItem): boolean {
  return UNAVAILABLE_STATUSES.has(room.current_status);
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-3 border-b border-border py-2 last:border-b-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>

      <div className="min-w-0 truncate text-xs font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function FieldAbsenceBadge({
  room,
}: {
  room: RoomBoardItem;
}): JSX.Element | null {
  if (!room.is_field_absent) {
    return null;
  }

  return (
    <StatusIndicator
      compact
      statusClassName={
        room.field_absence_is_overdue
          ? "status-under-maintenance"
          : "status-reserved"
      }
      label={room.field_absence_is_overdue ? "Field Overdue" : "Away In Field"}
      title={
        room.field_absence_is_overdue
          ? "Field absence return is overdue"
          : "Occupant is away in field"
      }
    />
  );
}

function RoomCardFlags({
  room,
  unavailable,
}: {
  room: RoomBoardItem;
  unavailable: boolean;
}): JSX.Element | null {
  if (
    !room.is_vip &&
    !room.is_delegate_suitable &&
    !room.is_field_absent &&
    !unavailable
  ) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {room.is_vip ? (
        <StatusIndicator
          compact
          withDot={false}
          statusClassName="status-reserved"
          label={
            <span className="inline-flex items-center gap-1">
              <Crown className="size-3" aria-hidden="true" />
              VIP
            </span>
          }
        />
      ) : null}

      {room.is_delegate_suitable ? (
        <StatusIndicator
          compact
          withDot={false}
          statusClassName="status-occupied"
          label="Delegate"
        />
      ) : null}

      {room.is_field_absent ? <FieldAbsenceBadge room={room} /> : null}

      {unavailable ? (
        <StatusIndicator
          compact
          statusClassName="status-muted"
          label="Not Allocatable"
        />
      ) : null}
    </div>
  );
}

function FieldAbsencePanel({
  room,
}: {
  room: RoomBoardItem;
}): JSX.Element | null {
  if (!room.is_field_absent) {
    return null;
  }

  return (
    <div
      className={cn(
        "mt-3 border px-3 py-2.5",
        room.field_absence_is_overdue
          ? "border-danger-600/25 bg-danger-50"
          : "border-warning-700/25 bg-warning-50",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldAbsenceBadge room={room} />

        <span
          className={cn(
            "text-xs font-bold",
            room.field_absence_is_overdue
              ? "text-danger-700"
              : "text-warning-700",
          )}
        >
          {room.field_absence_is_overdue
            ? "Return overdue"
            : `${room.field_absence_days_away} days away`}
        </span>
      </div>

      <div className="mt-2 grid gap-1.5 text-xs leading-5 text-muted">
        <div>
          <span className="font-semibold text-foreground">
            Expected return:
          </span>{" "}
          {formatDateTime(room.field_absence_expected_return_at)}
        </div>

        <div>
          <span className="font-semibold text-foreground">
            Days until return:
          </span>{" "}
          {room.field_absence_is_overdue
            ? "Overdue"
            : room.field_absence_days_until_return}
        </div>

        {room.field_absence_destination ? (
          <div>
            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
              <MapPin className="size-3.5" aria-hidden="true" />
              Destination:
            </span>{" "}
            {room.field_absence_destination}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RoomCard({ room, className }: RoomCardProps): JSX.Element {
  const status = formatRoomStatus(room.current_status);
  const unavailable = isUnavailable(room);
  const hasGuest = Boolean(room.current_guest_name);

  return (
    <article
      className={cn("room-card", "p-0", unavailable && "opacity-90", className)}
      data-room-id={room.room_id}
      data-room-status={room.current_status}
    >
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {getBuildingLabel(room)} · {getCampLabel(room)}
            </div>

            <h3 className="mt-2 text-3xl font-semibold leading-none tracking-[-0.06em] text-foreground">
              {getRoomTitle(room)}
            </h3>

            <div className="mt-2 truncate text-xs font-semibold text-muted">
              {getRoomTypeLabel(room)}
            </div>
          </div>

          <StatusIndicator
            compact
            label={status.label}
            statusClassName={status.statusClassName}
            title={status.label}
          />
        </div>

        <RoomCardFlags room={room} unavailable={unavailable} />
      </div>

      <div className="px-4 py-3">
        <div className="divide-y divide-border">
          <DetailLine label="Capacity" value={room.capacity ?? "—"} />

          <DetailLine
            label="Condition"
            value={formatLabel(room.condition_status)}
          />

          <DetailLine
            label="Guest"
            value={
              room.current_guest_id && room.current_guest_name ? (
                <GuestNameWithPhoto
                  guestId={room.current_guest_id}
                  name={room.current_guest_name}
                />
              ) : (
                "No active guest"
              )
            }
          />
        </div>

        <FieldAbsencePanel room={room} />

        {room.expected_departure_at ? (
          <div className="mt-3 border border-border bg-surface-2 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Expected departure
              </p>
            </div>

            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatDateTime(room.expected_departure_at)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <div className="min-w-0">
          <AutoStatusIndicator
            compact
            status={hasGuest ? "occupied" : room.current_status}
            label={hasGuest ? "Guest Assigned" : undefined}
            withDot
          />
        </div>

        <Link
          href={getRoomDetailHref(room.room_id)}
          className="room-secondary-action"
        >
          <Eye className="size-4" aria-hidden="true" />
          View
        </Link>
      </div>
    </article>
  );
}
