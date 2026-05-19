// src/components/room-board/room-board-client.tsx
"use client";

import type { JSX } from "react";
import { useMemo, useState } from "react";
import { BedDouble, Grid3X3, Layers3, ListChecks } from "lucide-react";
import type { RoomBoardItem } from "@/lib/queries/room-board/get-room-board";
import { RoomBoardFilters } from "@/components/room-board/room-board-filters";
import { RoomCard } from "@/components/room-board/room-card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AutoStatusIndicator } from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";

type RoomBoardClientProps = {
  rooms: RoomBoardItem[];
};

type RoomBoardView = "matrix" | "cards";

type SummaryTone = "success" | "warning" | "danger" | "info" | "brand";

type SummaryItem = {
  key: string;
  label: string;
  note: string;
  value: number;
  tone: SummaryTone;
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

const summaryToneClass: Record<SummaryTone, string> = {
  success: "ops-live-card-success",
  warning: "ops-live-card-warning",
  danger: "ops-live-card-danger",
  info: "ops-live-card-info",
  brand: "",
};

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

function getRoomTitle(room: RoomBoardItem): string {
  return room.room_number?.trim() || "Unnamed room";
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

function countByStatus(
  rooms: readonly RoomBoardItem[],
  statuses: readonly string[],
): number {
  const statusSet = new Set(statuses);

  return rooms.filter((room) => statusSet.has(room.current_status)).length;
}

function countBlockedRooms(rooms: readonly RoomBoardItem[]): number {
  return rooms.filter((room) => BLOCKED_ROOM_STATUSES.has(room.current_status))
    .length;
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
      const campCompare = a.subtitle.localeCompare(b.subtitle);
      return campCompare !== 0 ? campCompare : a.title.localeCompare(b.title);
    });
}

function buildSummary(rooms: readonly RoomBoardItem[]): SummaryItem[] {
  return [
    {
      key: "vacant_ready",
      label: "Vacant ready",
      value: countByStatus(rooms, ["vacant_ready"]),
      note: "Ready for allocation",
      tone: "success",
    },
    {
      key: "reserved",
      label: "Reserved",
      value: countByStatus(rooms, ["reserved"]),
      note: "Held for arrival",
      tone: "warning",
    },
    {
      key: "pending_check_in",
      label: "Check-in",
      value: countByStatus(rooms, ["pending_check_in"]),
      note: "Expected today",
      tone: "warning",
    },
    {
      key: "occupied",
      label: "Occupied",
      value: countByStatus(rooms, ["occupied"]),
      note: "Guest in room",
      tone: "info",
    },
    {
      key: "pending_checkout",
      label: "Checkout",
      value: countByStatus(rooms, ["pending_checkout"]),
      note: "Leaving soon",
      tone: "warning",
    },
    {
      key: "blocked",
      label: "Blocked",
      value: countBlockedRooms(rooms),
      note: "Not allocatable",
      tone: "danger",
    },
  ];
}

function RoomBoardViewSwitch({
  value,
  onChange,
}: {
  value: RoomBoardView;
  onChange: (value: RoomBoardView) => void;
}): JSX.Element {
  return (
    <div className="segmented-control" aria-label="Room board view">
      <button
        type="button"
        className={cn(
          "segmented-item",
          value === "matrix" && "segmented-item-active",
        )}
        aria-pressed={value === "matrix"}
        onClick={() => onChange("matrix")}
      >
        <Grid3X3 className="size-4" aria-hidden="true" />
        Matrix
      </button>

      <button
        type="button"
        className={cn(
          "segmented-item",
          value === "cards" && "segmented-item-active",
        )}
        aria-pressed={value === "cards"}
        onClick={() => onChange("cards")}
      >
        <Layers3 className="size-4" aria-hidden="true" />
        Cards
      </button>
    </div>
  );
}

function RoomSummaryStrip({
  summary,
}: {
  summary: SummaryItem[];
}): JSX.Element {
  return (
    <section aria-label="Room status summary" className="ops-live-strip">
      {summary.map((item) => (
        <article
          key={item.key}
          className={cn("ops-live-card", summaryToneClass[item.tone])}
        >
          <div className="ops-live-label">{item.label}</div>
          <div className="ops-live-value">{item.value}</div>
          <div className="ops-live-note">{item.note}</div>
        </article>
      ))}
    </section>
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
      <div className="room-cell-number">{getRoomTitle(room)}</div>

      <div className="room-cell-meta">
        {guestName || subtitle || "No active guest"}
      </div>

      <div className="room-cell-status">
        <span className="room-cell-status-text">
          {formatLabel(room.current_status)}
        </span>
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
          <h2 className="room-matrix-title">Interactive room matrix</h2>
          <p className="room-matrix-subtitle">
            Scan rooms by building, current status, and active guest state.
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

              <div className="room-matrix-grid room-matrix-grid-dense">
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

function SelectedRoomPanel({
  room,
}: {
  room: RoomBoardItem | null;
}): JSX.Element {
  if (!room) {
    return (
      <aside className="ops-card">
        <div className="ops-card-header">
          <div>
            <h2 className="ops-card-title">Room detail</h2>
            <p className="ops-card-meta">
              Select a room in the matrix to inspect occupancy and status.
            </p>
          </div>
        </div>

        <EmptyState
          size="sm"
          icon={<BedDouble className="size-4" />}
          title="No room selected"
          description="Choose any room from the matrix to view details."
        />
      </aside>
    );
  }

  return (
    <aside className="ops-card">
      <div className="ops-card-header">
        <div className="min-w-0">
          <h2 className="ops-card-title truncate">Room {getRoomTitle(room)}</h2>
          <p className="ops-card-meta truncate">
            {room.camp_name || "Unknown camp"} ·{" "}
            {room.building_name || "Unknown building"}
          </p>
        </div>

        <AutoStatusIndicator status={room.current_status} />
      </div>

      <div className="metadata-grid xl:grid-cols-1">
        <div className="metadata-item">
          <div className="metadata-label">Room type</div>
          <div className="metadata-value">{room.room_type || "Not set"}</div>
        </div>

        <div className="metadata-item">
          <div className="metadata-label">Condition</div>
          <div className="metadata-value">
            {formatLabel(room.condition_status)}
          </div>
        </div>

        <div className="metadata-item">
          <div className="metadata-label">Current guest</div>
          <div className="metadata-value">
            {room.current_guest_name || "No active guest"}
          </div>
        </div>

        <div className="metadata-item">
          <div className="metadata-label">Delegate suitability</div>
          <div className="metadata-value">
            {room.is_delegate_suitable ? "Suitable" : "Not marked"}
            {room.is_vip ? " · VIP" : ""}
          </div>
        </div>
      </div>
    </aside>
  );
}

function RoomCardsView({ rooms }: { rooms: RoomBoardItem[] }): JSX.Element {
  return (
    <section className="room-board-grid" aria-label="Room cards">
      {rooms.map((room) => (
        <RoomCard key={room.room_id} room={room} />
      ))}
    </section>
  );
}

export function RoomBoardClient({ rooms }: RoomBoardClientProps): JSX.Element {
  const [selectedCamp, setSelectedCamp] = useState(ALL_VALUE);
  const [selectedBuilding, setSelectedBuilding] = useState(ALL_VALUE);
  const [selectedStatus, setSelectedStatus] = useState(ALL_VALUE);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<RoomBoardView>("matrix");
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

      <RoomSummaryStrip summary={summary} />

      <section className="toolbar" aria-label="Room board controls">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-muted" aria-hidden="true" />
            <p className="text-sm font-semibold text-foreground">
              Showing {filteredRooms.length} of {rooms.length} rooms
            </p>
          </div>

          <p className="mt-1 text-xs leading-5 text-muted">
            Use matrix mode for fast operational scanning. Use cards for full
            room actions.
          </p>
        </div>

        <RoomBoardViewSwitch value={view} onChange={setView} />
      </section>

      {filteredRooms.length > 0 ? (
        view === "matrix" ? (
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
          <RoomCardsView rooms={filteredRooms} />
        )
      ) : (
        <EmptyState
          size="lg"
          icon={<BedDouble className="size-5" />}
          title="No rooms found"
          description="No rooms match the current filters. Clear the filters or adjust your search."
        />
      )}
    </div>
  );
}
