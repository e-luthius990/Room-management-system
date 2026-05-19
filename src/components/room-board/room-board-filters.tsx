// src/components/room-board/room-board-filters.tsx
"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
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
  loading?: boolean;
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

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueOptions(
  rooms: readonly RoomBoardItem[],
  getId: (room: RoomBoardItem) => string | null | undefined,
  getLabel: (room: RoomBoardItem) => string | null | undefined,
): Option[] {
  const optionsById = new Map<string, Option>();

  for (const room of rooms) {
    const id = getId(room)?.trim();
    const label = getLabel(room)?.trim();

    if (!hasText(id) || !hasText(label)) {
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
  loading = false,
  onCampChange,
  onBuildingChange,
  onStatusChange,
  onSearchChange,
}: RoomBoardFiltersProps): JSX.Element {
  const campOptions = useMemo(
    () =>
      uniqueOptions(
        rooms,
        (room) => room.camp_id,
        (room) => room.camp_name,
      ),
    [rooms],
  );

  const buildingOptions = useMemo(() => {
    const scopedRooms =
      selectedCamp === ALL_VALUE
        ? rooms
        : rooms.filter((room) => room.camp_id === selectedCamp);

    return uniqueOptions(
      scopedRooms,
      (room) => room.building_id,
      (room) => room.building_name,
    );
  }, [rooms, selectedCamp]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedCamp !== ALL_VALUE ||
    selectedBuilding !== ALL_VALUE ||
    selectedStatus !== ALL_VALUE;

  function handleCampChange(value: string): void {
    onCampChange(value);
    onBuildingChange(ALL_VALUE);
  }

  function clearFilters(): void {
    if (loading || !hasActiveFilters) {
      return;
    }

    onSearchChange("");
    onCampChange(ALL_VALUE);
    onBuildingChange(ALL_VALUE);
    onStatusChange(ALL_VALUE);
  }

  return (
    <section
      className="ops-command"
      aria-label="Room board filters"
      aria-busy={loading || undefined}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal
              className="size-4 text-muted"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-foreground">
              Room board controls
            </h2>
          </div>

          <p className="mt-1 text-xs leading-5 text-muted">
            Filter by camp, building, status, or search by room, guest, type, or
            location.
          </p>
        </div>
      </div>

      <div className="ops-command-inner">
        <Input
          aria-label="Search rooms"
          id="room-board-search"
          value={search}
          disabled={loading}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search room, guest, building, camp, type..."
          autoComplete="off"
          leftIcon={<Search className="size-4" aria-hidden="true" />}
          wrapperClassName="min-w-0"
        />

        <Select
          aria-label="Filter by camp"
          id="room-board-camp"
          value={selectedCamp}
          disabled={loading}
          onChange={(event) => handleCampChange(event.target.value)}
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
          disabled={loading || buildingOptions.length === 0}
          onChange={(event) => onBuildingChange(event.target.value)}
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
          disabled={loading}
          onChange={(event) => onStatusChange(event.target.value)}
          options={statusOptions}
        />

        <Button
          type="button"
          variant="secondary"
          onClick={clearFilters}
          disabled={!hasActiveFilters || loading}
          loading={loading}
          loadingText="Updating"
          leftIcon={<RotateCcw className="size-4" aria-hidden="true" />}
          className="whitespace-nowrap"
        >
          Clear
        </Button>
      </div>
    </section>
  );
}
