"use client";

import { useMemo, useState } from "react";
import type { RoomBoardItem } from "@/lib/queries/room-board/get-room-board";
import { RoomBoardFilters } from "@/components/room-board/room-board-filters";
import { RoomCard } from "@/components/room-board/room-card";
import { EmptyState } from "@/components/ui/EmptyState";

type RoomBoardClientProps = {
  rooms: RoomBoardItem[];
};

type SummaryItem = {
  key: string;
  label: string;
  note: string;
  value: number;
};

const ALL_VALUE = "all";

const HIDDEN_ROOM_STATUSES = new Set([
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

function countByStatus(
  rooms: RoomBoardItem[],
  statuses: readonly string[],
): number {
  const statusSet = new Set(statuses);

  return rooms.filter((room) => statusSet.has(room.current_status)).length;
}

function getSearchableStatus(status: string): string {
  if (HIDDEN_ROOM_STATUSES.has(status)) {
    return "";
  }

  return status;
}

export function RoomBoardClient({
  rooms,
}: RoomBoardClientProps): React.JSX.Element {
  const [selectedCamp, setSelectedCamp] = useState(ALL_VALUE);
  const [selectedBuilding, setSelectedBuilding] = useState(ALL_VALUE);
  const [selectedStatus, setSelectedStatus] = useState(ALL_VALUE);
  const [search, setSearch] = useState("");

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

  const summary = useMemo<SummaryItem[]>(
    () => [
      {
        key: "vacant_ready",
        label: "Vacant ready",
        value: countByStatus(filteredRooms, ["vacant_ready"]),
        note: "Ready",
      },
      {
        key: "reserved",
        label: "Reserved",
        value: countByStatus(filteredRooms, ["reserved"]),
        note: "Held",
      },
      {
        key: "pending_check_in",
        label: "Check-in",
        value: countByStatus(filteredRooms, ["pending_check_in"]),
        note: "Expected",
      },
      {
        key: "occupied",
        label: "Occupied",
        value: countByStatus(filteredRooms, ["occupied"]),
        note: "In room",
      },
      {
        key: "pending_checkout",
        label: "Checkout",
        value: countByStatus(filteredRooms, ["pending_checkout"]),
        note: "Leaving",
      },
    ],
    [filteredRooms],
  );

  function handleCampChange(campId: string): void {
    setSelectedCamp(campId);
    setSelectedBuilding(ALL_VALUE);
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
        onBuildingChange={setSelectedBuilding}
        onStatusChange={setSelectedStatus}
        onSearchChange={setSearch}
      />

      <section
        aria-label="Room status summary"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
      >
        {summary.map((item) => (
          <article
            key={item.key}
            className="rounded-2xl border border-border bg-surface px-3 py-2.5 shadow-xs"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {item.label}
            </div>

            <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground">
              {item.value}
            </div>

            <div className="mt-0.5 text-xs leading-5 text-muted">
              {item.note}
            </div>
          </article>
        ))}
      </section>

      <div className="rounded-2xl border border-border bg-surface/70 px-4 py-3 text-sm text-muted">
        Showing{" "}
        <span className="font-semibold text-foreground">
          {filteredRooms.length}
        </span>{" "}
        of <span className="font-semibold text-foreground">{rooms.length}</span>{" "}
        rooms
      </div>

      {filteredRooms.length > 0 ? (
        <section className="room-board-grid">
          {filteredRooms.map((room) => (
            <RoomCard key={room.room_id} room={room} />
          ))}
        </section>
      ) : (
        <EmptyState
          title="No rooms found"
          description="No rooms match the current filters. Clear the filters or adjust your search."
        />
      )}
    </div>
  );
}
