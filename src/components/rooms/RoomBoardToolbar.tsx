"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";

export type RoomBoardToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;

  statusValue: string;
  onStatusChange: (value: string) => void;
  statusOptions: readonly SelectOption[];

  buildingValue?: string;
  onBuildingChange?: (value: string) => void;
  buildingOptions?: readonly SelectOption[];

  resultCount?: number;
  loading?: boolean;
  actions?: ReactNode;

  onRefresh?: () => void;
  onClear?: () => void;

  className?: string;
};

const hiddenStatusValues = new Set([
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
  "under_maintenance",
]);

function isActiveValue(value: string | undefined): boolean {
  return Boolean(value && value !== "all");
}

export function RoomBoardToolbar({
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  statusOptions,
  buildingValue,
  onBuildingChange,
  buildingOptions = [],
  resultCount,
  loading = false,
  actions,
  onRefresh,
  onClear,
  className,
}: RoomBoardToolbarProps): React.JSX.Element {
  const visibleStatusOptions = statusOptions.filter(
    (option) => !hiddenStatusValues.has(option.value),
  );

  const hasFilters =
    searchValue.trim().length > 0 ||
    isActiveValue(statusValue) ||
    isActiveValue(buildingValue);

  return (
    <section className={cn("command-bar", className)}>
      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_minmax(150px,0.8fr)_minmax(150px,0.8fr)_auto] lg:items-end">
        <Input
          aria-label="Search rooms"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search room, guest, building..."
          autoComplete="off"
        />

        <Select
          aria-label="Filter by status"
          value={statusValue}
          onChange={(event) => onStatusChange(event.target.value)}
          options={visibleStatusOptions}
        />

        {onBuildingChange ? (
          <Select
            aria-label="Filter by building"
            value={buildingValue ?? "all"}
            onChange={(event) => onBuildingChange(event.target.value)}
            options={buildingOptions}
          />
        ) : (
          <div className="hidden lg:block" />
        )}

        <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
          {typeof resultCount === "number" ? (
            <div className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-muted">
              {resultCount} {resultCount === 1 ? "room" : "rooms"}
            </div>
          ) : null}

          {onRefresh ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              loading={loading}
            >
              Refresh
            </Button>
          ) : null}

          {onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasFilters}
              onClick={onClear}
            >
              Clear
            </Button>
          ) : null}

          {actions}
        </div>
      </div>
    </section>
  );
}
