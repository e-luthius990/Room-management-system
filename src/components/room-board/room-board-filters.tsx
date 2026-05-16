"use client";

import type { RoomBoardItem } from "@/lib/queries/room-board/get-room-board";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type RoomBoardFiltersProps = {
  rooms: RoomBoardItem[];
  selectedCamp: string;
  selectedBuilding: string;
  selectedStatus: string;
  search: string;
  onCampChange: (value: string) => void;
  onBuildingChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

type Option = {
  id: string;
  label: string;
};

const ALL_VALUE = "all";

const statusOptions = [
  { value: ALL_VALUE, label: "All statuses" },
  { value: "vacant_ready", label: "Vacant ready" },
  { value: "reserved", label: "Reserved" },
  { value: "pending_check_in", label: "Pending check-in" },
  { value: "occupied", label: "Occupied" },
  { value: "pending_checkout", label: "Pending checkout" },
  { value: "out_of_service", label: "Out of service" },
  { value: "manager_hold", label: "Manager hold" },
] as const;

function uniqueOptions(
  rooms: RoomBoardItem[],
  getId: (room: RoomBoardItem) => string | null | undefined,
  getLabel: (room: RoomBoardItem) => string | null | undefined,
): Option[] {
  const optionsById = new Map<string, Option>();

  for (const room of rooms) {
    const id = getId(room);
    const label = getLabel(room);

    if (!id || !label) {
      continue;
    }

    if (!optionsById.has(id)) {
      optionsById.set(id, { id, label });
    }
  }

  return Array.from(optionsById.values()).sort((first, second) =>
    first.label.localeCompare(second.label, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function RoomBoardFilters({
  rooms,
  selectedCamp,
  selectedBuilding,
  selectedStatus,
  search,
  onCampChange,
  onBuildingChange,
  onStatusChange,
  onSearchChange,
}: RoomBoardFiltersProps): React.JSX.Element {
  const campOptions = uniqueOptions(
    rooms,
    (room) => room.camp_id,
    (room) => room.camp_name,
  );

  const roomsForBuildingFilter =
    selectedCamp === ALL_VALUE
      ? rooms
      : rooms.filter((room) => room.camp_id === selectedCamp);

  const buildingOptions = uniqueOptions(
    roomsForBuildingFilter,
    (room) => room.building_id,
    (room) => room.building_name,
  );

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedCamp !== ALL_VALUE ||
    selectedBuilding !== ALL_VALUE ||
    selectedStatus !== ALL_VALUE;

  function clearFilters(): void {
    onSearchChange("");
    onCampChange(ALL_VALUE);
    onBuildingChange(ALL_VALUE);
    onStatusChange(ALL_VALUE);
  }

  return (
    <section className="command-bar">
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_auto] lg:items-end">
        <Input
          aria-label="Search rooms"
          id="room-board-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search room, guest, building, organization..."
          autoComplete="off"
        />

        <Select
          aria-label="Filter by camp"
          id="room-board-camp"
          value={selectedCamp}
          onChange={(event) => {
            onCampChange(event.target.value);
            onBuildingChange(ALL_VALUE);
          }}
          options={[
            { value: ALL_VALUE, label: "All camps" },
            ...campOptions.map((camp) => ({
              value: camp.id,
              label: camp.label,
            })),
          ]}
        />

        <Select
          aria-label="Filter by building"
          id="room-board-building"
          value={selectedBuilding}
          onChange={(event) => onBuildingChange(event.target.value)}
          disabled={buildingOptions.length === 0}
          options={[
            { value: ALL_VALUE, label: "All buildings" },
            ...buildingOptions.map((building) => ({
              value: building.id,
              label: building.label,
            })),
          ]}
        />

        <Select
          aria-label="Filter by room status"
          id="room-board-status"
          value={selectedStatus}
          onChange={(event) => onStatusChange(event.target.value)}
          options={statusOptions}
        />

        <Button
          type="button"
          variant="secondary"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className="whitespace-nowrap"
        >
          Clear
        </Button>
      </div>
    </section>
  );
}
