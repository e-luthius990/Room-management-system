// src/components/room-board/room-board-filters.tsx
"use client";

import type { JSX } from "react";
import { useMemo } from "react";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { RoomBoardItem } from "@/lib/queries/room-board/get-room-board";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";

type RoomBoardFiltersProps = {
  rooms: RoomBoardItem[];
  selectedCamp: string;
  selectedBuilding: string;
  selectedStatus: string;
  search: string;
  canSelectCamp: boolean;
  assignedCampLabel: string;
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

function formatActiveFilterCount(count: number): string {
  if (count === 0) {
    return "No filters";
  }

  if (count === 1) {
    return "1 filter";
  }

  return `${count} filters`;
}

export function RoomBoardFilters({
  rooms,
  selectedCamp,
  selectedBuilding,
  selectedStatus,
  search,
  canSelectCamp,
  assignedCampLabel,
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

  const activeFilterCount = [
    search.trim().length > 0,
    canSelectCamp && selectedCamp !== ALL_VALUE,
    selectedBuilding !== ALL_VALUE,
    selectedStatus !== ALL_VALUE,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  function handleCampChange(value: string): void {
    onCampChange(value);
    onBuildingChange(ALL_VALUE);
  }

  function clearFilters(): void {
    if (loading || !hasActiveFilters) {
      return;
    }

    onSearchChange("");
    if (canSelectCamp) {
      onCampChange(ALL_VALUE);
    }
    onBuildingChange(ALL_VALUE);
    onStatusChange(ALL_VALUE);
  }

  return (
    <section
      className="ops-command"
      aria-label="Room board filters"
      aria-busy={loading || undefined}
      data-active-filters={hasActiveFilters ? "true" : undefined}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(18rem,1.45fr)_11rem_11rem_12rem]">
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
            className="font-semibold"
          />

          {canSelectCamp ? (
            <Select
              aria-label="Filter by camp"
              id="room-board-camp"
              value={selectedCamp}
              disabled={loading}
            onChange={(event) => handleCampChange(event.target.value)}
            className="font-semibold"
            options={[
                { value: ALL_VALUE, label: "All camps" },
                ...campOptions.map((camp) => ({
                  value: camp.id,
                  label: camp.label,
                })),
              ]}
            />
          ) : (
            <div
            className="flex min-h-10 min-w-0 items-center border border-border bg-surface px-3 text-sm font-semibold text-foreground"
              aria-label="Assigned camp"
            >
              <span className="truncate">{assignedCampLabel}</span>
            </div>
          )}

          <Select
            aria-label="Filter by building"
            id="room-board-building"
            value={selectedBuilding}
            disabled={loading || buildingOptions.length === 0}
            onChange={(event) => onBuildingChange(event.target.value)}
            className="font-semibold"
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
            className="font-semibold"
            options={statusOptions}
          />
        </div>

        <div className="flex items-center justify-between gap-2 xl:justify-end">
          <div
            className={cn(
              "inline-flex min-h-9 items-center gap-2 border px-3 text-xs font-bold uppercase tracking-[0.12em]",
              hasActiveFilters
                ? "border-brand-600/25 bg-brand-50 text-brand-700"
                : "border-border bg-surface-2 text-muted",
            )}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            <span>{formatActiveFilterCount(activeFilterCount)}</span>
          </div>

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
      </div>
    </section>
  );
}
