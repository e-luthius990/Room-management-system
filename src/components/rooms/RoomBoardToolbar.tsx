"use client";

import type { ReactNode } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
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

function getFilterCount({
  searchValue,
  statusValue,
  buildingValue,
}: {
  searchValue: string;
  statusValue: string;
  buildingValue?: string;
}): number {
  return [
    searchValue.trim().length > 0,
    isActiveValue(statusValue),
    isActiveValue(buildingValue),
  ].filter(Boolean).length;
}

function formatFilterCount(count: number): string {
  if (count === 0) {
    return "No filters";
  }

  if (count === 1) {
    return "1 filter";
  }

  return `${count} filters`;
}

function formatResultCount(value: number | undefined): string {
  if (typeof value !== "number") {
    return "Rooms";
  }

  return `${value} ${value === 1 ? "room" : "rooms"}`;
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

  const activeFilterCount = getFilterCount({
    searchValue,
    statusValue,
    buildingValue,
  });

  const hasFilters = activeFilterCount > 0;

  function handleRefresh(): void {
    if (loading) {
      return;
    }

    onRefresh?.();
  }

  function handleClear(): void {
    if (loading || !hasFilters) {
      return;
    }

    onClear?.();
  }

  return (
    <section
      className={cn("ops-command", className)}
      aria-label="Room board controls"
      aria-busy={loading || undefined}
      data-active-filters={hasFilters ? "true" : undefined}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(18rem,1.45fr)_12rem_12rem]">
          <Input
            aria-label="Search rooms"
            value={searchValue}
            disabled={loading}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
            placeholder="Search room, guest, building..."
            autoComplete="off"
            leftIcon={<Search className="size-4" aria-hidden="true" />}
            wrapperClassName="min-w-0"
            className="font-semibold"
          />

          <Select
            aria-label="Filter by status"
            value={statusValue}
            disabled={loading}
            onChange={(event) => onStatusChange(event.currentTarget.value)}
            className="font-semibold"
            options={visibleStatusOptions}
          />

          {onBuildingChange ? (
            <Select
              aria-label="Filter by building"
              value={buildingValue ?? "all"}
              disabled={loading || buildingOptions.length === 0}
              onChange={(event) => onBuildingChange(event.currentTarget.value)}
              className="font-semibold"
              options={buildingOptions}
            />
          ) : (
            <div className="hidden lg:block" />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 xl:justify-end">
          <div
            className={cn(
              "inline-flex min-h-9 items-center gap-2 border px-3 text-xs font-bold uppercase tracking-[0.12em]",
              hasFilters
                ? "border-brand-600/25 bg-brand-50 text-brand-700"
                : "border-border bg-surface-2 text-muted",
            )}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden="true" />
            <span>{formatFilterCount(activeFilterCount)}</span>
          </div>

          <div className="inline-flex min-h-9 items-center border border-border bg-surface px-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">
            {loading ? (
              <span aria-hidden="true" className="inline-spinner mr-2" />
            ) : null}
            <span>
              {loading ? "Refreshing" : formatResultCount(resultCount)}
            </span>
          </div>

          {onRefresh ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              loading={loading}
              loadingText="Refreshing"
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          ) : null}

          {onClear ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!hasFilters || loading}
              onClick={handleClear}
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
