// src/components/room-board/room-board-client.tsx
"use client";

import type { JSX } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BedDouble, Crown, Eye, MapPin } from "lucide-react";

import type {
  RoomBoardItem,
  RoomBoardSummary,
} from "@/lib/queries/room-board/get-room-board";
import { APP_ROUTES } from "@/lib/auth/routes";
import { RoomBoardFilters } from "@/components/room-board/room-board-filters";
import { RoomBoardSummaryCards } from "@/components/room-board/room-board-summary";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AutoStatusIndicator,
  StatusIndicator,
} from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";

type RoomBoardClientProps = {
  rooms: RoomBoardItem[];
};

type RoomGroup = {
  key: string;
  title: string;
  subtitle: string;
  rooms: RoomBoardItem[];
};

const ALL_VALUE = "all";

const BLOCKED_ROOM_STATUSES = new Set([
  "under_maintenance",
  "out_of_service",
  "manager_hold",
]);

const HIDDEN_SEARCH_STATUSES = new Set([
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
  "under_maintenance",
]);

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatusClass(status: string | null | undefined): string {
  return String(status ?? "muted")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatLabel(value: string | null | undefined): string {
  const normalized = String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Unknown";
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function getRoomTitle(room: RoomBoardItem): string {
  return room.room_number?.trim() || "Unnamed";
}

function getRoomSubtitle(room: RoomBoardItem): string {
  return [room.building_name, room.room_type].filter(Boolean).join(" · ");
}

function getSearchableStatus(status: string): string {
  if (HIDDEN_SEARCH_STATUSES.has(status)) {
    return "";
  }

  return status;
}

function sortRooms(a: RoomBoardItem, b: RoomBoardItem): number {
  return getRoomTitle(a).localeCompare(getRoomTitle(b), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function buildRoomGroups(rooms: readonly RoomBoardItem[]): RoomGroup[] {
  const groups = new Map<string, RoomGroup>();

  for (const room of rooms) {
    const campName = room.camp_name?.trim() || "Unassigned camp";
    const buildingName = room.building_name?.trim() || "Unassigned building";
    const key = `${campName}:${buildingName}`;

    const existing = groups.get(key);

    if (existing) {
      existing.rooms.push(room);
      continue;
    }

    groups.set(key, {
      key,
      title: buildingName,
      subtitle: campName,
      rooms: [room],
    });
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      rooms: [...group.rooms].sort(sortRooms),
    }))
    .sort((a, b) => {
      const campCompare = a.subtitle.localeCompare(b.subtitle, undefined, {
        numeric: true,
        sensitivity: "base",
      });

      if (campCompare !== 0) {
        return campCompare;
      }

      return a.title.localeCompare(b.title, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    });
}

function buildSummary(rooms: readonly RoomBoardItem[]): RoomBoardSummary {
  const fieldAbsent = rooms.filter((room) => room.is_field_absent).length;
  const fieldAbsenceOverdue = rooms.filter(
    (room) => room.field_absence_is_overdue,
  ).length;

  return {
    total: rooms.length,
    vacantReady: rooms.filter((room) => room.current_status === "vacant_ready")
      .length,
    reserved: rooms.filter((room) => room.current_status === "reserved").length,
    pendingCheckIn: rooms.filter(
      (room) => room.current_status === "pending_check_in",
    ).length,
    occupied: rooms.filter((room) => room.current_status === "occupied").length,
    pendingCheckout: rooms.filter(
      (room) => room.current_status === "pending_checkout",
    ).length,
    blocked: rooms.filter((room) =>
      BLOCKED_ROOM_STATUSES.has(room.current_status),
    ).length,
    fieldAbsent,
    fieldAbsenceOverdue,
  };
}

function FieldAbsenceBadge({
  room,
  compact = false,
}: {
  room: RoomBoardItem;
  compact?: boolean;
}): JSX.Element | null {
  if (!room.is_field_absent) {
    return null;
  }

  return (
    <StatusIndicator
      compact={compact}
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

function RoomMatrixCell({
  room,
  active,
  onSelect,
}: {
  room: RoomBoardItem;
  active: boolean;
  onSelect: (roomId: string) => void;
}): JSX.Element {
  const statusClass = normalizeStatusClass(room.current_status);
  const subtitle = getRoomSubtitle(room);
  const guestName = room.current_guest_name?.trim();

  return (
    <button
      type="button"
      onClick={() => onSelect(room.room_id)}
      aria-pressed={active}
      className={cn(
        "room-cell",
        `room-cell-${statusClass}`,
        active && "room-cell-active",
      )}
    >
      <div className="room-cell-code">
        {room.building_name || room.camp_name || "Room"}
      </div>

      <div className="mt-2 text-2xl font-semibold leading-7 tracking-[-0.055em] text-foreground">
        {getRoomTitle(room)}
      </div>

      <div className="mt-1 truncate text-[11px] leading-4 text-muted">
        {guestName || subtitle || "No active guest"}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <StatusIndicator
          compact
          withDot={false}
          statusClassName={`status-${statusClass}`}
          label={formatLabel(room.current_status)}
        />

        <FieldAbsenceBadge room={room} compact />
      </div>
    </button>
  );
}

function RoomMatrix({
  groups,
  selectedRoomId,
  onSelectRoom,
}: {
  groups: RoomGroup[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
}): JSX.Element {
  return (
    <section className="room-matrix" aria-label="Interactive room matrix">
      <div className="room-matrix-header">
        <div className="min-w-0">
          <h2 className="room-matrix-title">Room matrix</h2>
          <p className="room-matrix-subtitle">
            Grouped by camp and building. Select a room to inspect live state.
          </p>
        </div>

        <div className="room-matrix-legend">
          <span className="room-matrix-legend-item text-success-700">
            <span className="room-matrix-legend-dot" />
            Ready
          </span>

          <span className="room-matrix-legend-item text-info-700">
            <span className="room-matrix-legend-dot" />
            Occupied
          </span>

          <span className="room-matrix-legend-item text-warning-700">
            <span className="room-matrix-legend-dot" />
            Reserved
          </span>

          <span className="room-matrix-legend-item text-danger-700">
            <span className="room-matrix-legend-dot" />
            Blocked
          </span>
        </div>
      </div>

      <div className="room-matrix-scroll">
        <div className="space-y-4 p-3">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`${group.key}-heading`}>
              <div className="mb-2 flex items-end justify-between gap-3 px-1">
                <div className="min-w-0">
                  <h3
                    id={`${group.key}-heading`}
                    className="truncate text-sm font-semibold text-foreground"
                  >
                    {group.title}
                  </h3>

                  <p className="truncate text-xs text-muted">
                    {group.subtitle} · {group.rooms.length} rooms
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
                {group.rooms.map((room) => (
                  <RoomMatrixCell
                    key={room.room_id}
                    room={room}
                    active={selectedRoomId === room.room_id}
                    onSelect={onSelectRoom}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

function InspectorRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 border-b border-border py-2.5 last:border-b-0">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>

      <div className="min-w-0 text-sm font-semibold leading-5 text-foreground">
        {value}
      </div>
    </div>
  );
}

function SelectedRoomPanel({
  room,
}: {
  room: RoomBoardItem | null;
}): JSX.Element {
  if (!room) {
    return (
      <aside className="ops-inspector-card">
        <div className="ops-card-header">
          <div>
            <h2 className="ops-card-title">Room detail</h2>
            <p className="ops-card-meta">
              Select a room in the matrix to inspect occupancy and status.
            </p>
          </div>
        </div>

        <EmptyState
          operational
          align="left"
          size="sm"
          icon={<BedDouble className="size-4" />}
          title="No room selected"
          description="Choose a room from the matrix."
        />
      </aside>
    );
  }

  return (
    <aside className="ops-inspector-card">
      <div className="border-b border-border pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              Selected room
            </div>

            <h2 className="mt-1 text-4xl font-semibold leading-none tracking-[-0.065em] text-foreground">
              {getRoomTitle(room)}
            </h2>

            <p className="mt-2 truncate text-xs font-semibold text-muted">
              {room.camp_name || "Unknown camp"} ·{" "}
              {room.building_name || "Unknown building"}
            </p>
          </div>

          <AutoStatusIndicator compact status={room.current_status} />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <FieldAbsenceBadge room={room} compact />

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
        </div>
      </div>

      <div className="mt-3 divide-y divide-border">
        <InspectorRow label="Type" value={room.room_type || "Not set"} />

        <InspectorRow
          label="Condition"
          value={formatLabel(room.condition_status)}
        />

        <InspectorRow
          label="Guest"
          value={room.current_guest_name || "No active guest"}
        />

        <InspectorRow
          label="Departure"
          value={formatDateTime(room.expected_departure_at)}
        />
      </div>

      {room.is_field_absent ? (
        <div
          className={cn(
            "mt-4 border px-3 py-2.5",
            room.field_absence_is_overdue
              ? "border-danger-600/25 bg-danger-50"
              : "border-warning-700/25 bg-warning-50",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <FieldAbsenceBadge room={room} compact />

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
      ) : null}

      <div className="mt-4 grid gap-2 border-t border-border pt-4">
        <Link
          href={APP_ROUTES.rooms.detail(room.room_id)}
          className="btn-primary"
        >
          <Eye className="size-4" aria-hidden="true" />
          Open room
        </Link>
      </div>
    </aside>
  );
}

export function RoomBoardClient({ rooms }: RoomBoardClientProps): JSX.Element {
  const [selectedCamp, setSelectedCamp] = useState(ALL_VALUE);
  const [selectedBuilding, setSelectedBuilding] = useState(ALL_VALUE);
  const [selectedStatus, setSelectedStatus] = useState(ALL_VALUE);
  const [search, setSearch] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    rooms[0]?.room_id ?? null,
  );

  const filteredRooms = useMemo(() => {
    const searchTerm = normalize(search);

    return rooms.filter((room) => {
      if (selectedCamp !== ALL_VALUE && room.camp_id !== selectedCamp) {
        return false;
      }

      if (
        selectedBuilding !== ALL_VALUE &&
        room.building_id !== selectedBuilding
      ) {
        return false;
      }

      if (
        selectedStatus !== ALL_VALUE &&
        room.current_status !== selectedStatus
      ) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      const searchableText = normalize(
        [
          room.room_number,
          room.camp_name,
          room.building_name,
          room.room_type,
          getSearchableStatus(room.current_status),
          room.condition_status,
          room.current_guest_name,
          room.current_guest_id,
          room.current_stay_id,
          room.is_field_absent ? "away in field field absence" : "",
          room.field_absence_status,
          room.field_absence_destination,
          room.field_absence_reason,
          room.field_absence_is_overdue ? "field overdue" : "",
          room.is_vip ? "vip" : "",
          room.is_delegate_suitable ? "delegate suitable" : "",
        ].join(" "),
      );

      return searchableText.includes(searchTerm);
    });
  }, [rooms, search, selectedBuilding, selectedCamp, selectedStatus]);

  const summary = useMemo(() => buildSummary(filteredRooms), [filteredRooms]);
  const groups = useMemo(() => buildRoomGroups(filteredRooms), [filteredRooms]);

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId) {
      return filteredRooms[0] ?? null;
    }

    return (
      filteredRooms.find((room) => room.room_id === selectedRoomId) ??
      filteredRooms[0] ??
      null
    );
  }, [filteredRooms, selectedRoomId]);

  function handleCampChange(campId: string): void {
    setSelectedCamp(campId);
    setSelectedBuilding(ALL_VALUE);
    setSelectedRoomId(null);
  }

  function handleBuildingChange(buildingId: string): void {
    setSelectedBuilding(buildingId);
    setSelectedRoomId(null);
  }

  function handleStatusChange(status: string): void {
    setSelectedStatus(status);
    setSelectedRoomId(null);
  }

  function handleSearchChange(value: string): void {
    setSearch(value);
    setSelectedRoomId(null);
  }

  return (
    <div className="page-stack">
      <RoomBoardFilters
        rooms={rooms}
        selectedCamp={selectedCamp}
        selectedBuilding={selectedBuilding}
        selectedStatus={selectedStatus}
        search={search}
        onCampChange={handleCampChange}
        onBuildingChange={handleBuildingChange}
        onStatusChange={handleStatusChange}
        onSearchChange={handleSearchChange}
      />

      <RoomBoardSummaryCards summary={summary} />

      {filteredRooms.length > 0 ? (
        <section className="ops-console-layout">
          <div className="ops-console-main">
            <RoomMatrix
              groups={groups}
              selectedRoomId={selectedRoom?.room_id ?? null}
              onSelectRoom={setSelectedRoomId}
            />
          </div>

          <div className="ops-console-rail">
            <SelectedRoomPanel room={selectedRoom} />
          </div>
        </section>
      ) : (
        <EmptyState
          operational
          align="left"
          size="sm"
          icon={<BedDouble className="size-5" />}
          title="No rooms found"
          description="No rooms match the current filters. Clear the filters or adjust your search."
        />
      )}
    </div>
  );
}
