// src/components/ui/DataTable.tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { EmptyState } from "@/components/ui/EmptyState";

export type DataTableColumn<TData> = {
  id: string;
  header: React.ReactNode;
  accessor?: keyof TData;
  cell?: (row: TData, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: "left" | "center" | "right";
  hideOnMobile?: boolean;
};

export type DataTableProps<TData> = {
  data: readonly TData[];
  columns: readonly DataTableColumn<TData>[];
  getRowKey: (row: TData, index: number) => React.Key;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  className?: string;
  tableClassName?: string;
  loading?: boolean;
  loadingRows?: number;
  constrained?: boolean;
  stickyHeader?: boolean;
  density?: "comfortable" | "compact";
  caption?: React.ReactNode;
  onRowClick?: (row: TData, index: number) => void;
  getRowAriaLabel?: (row: TData, index: number) => string;
  rowClassName?: (row: TData, index: number) => string | undefined;
};

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

const densityCellClass = {
  comfortable: "",
  compact: "[&_th]:py-2 [&_td]:py-2",
} as const;

const DEFAULT_LOADING_ROWS = 5;

function getAccessorValue<TData>(
  row: TData,
  accessor: keyof TData | undefined,
): React.ReactNode {
  if (!accessor) {
    return "—";
  }

  const value = row[accessor];

  if (value == null || value === "") {
    return "—";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "—" : value.toLocaleString();
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  if (React.isValidElement(value)) {
    return value;
  }

  return String(value);
}

function getLoadingRows(count: number): readonly number[] {
  const safeCount = Number.isFinite(count)
    ? Math.max(1, Math.min(Math.trunc(count), 25))
    : DEFAULT_LOADING_ROWS;

  return Array.from({ length: safeCount }, (_, index) => index);
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      'a, button, input, textarea, select, summary, [role="button"], [data-row-click-ignore="true"]',
    ),
  );
}

function DataTableSkeleton<TData>({
  columns,
  rows,
}: {
  columns: readonly DataTableColumn<TData>[];
  rows: readonly number[];
}): React.JSX.Element {
  return (
    <>
      {rows.map((rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {columns.map((column, columnIndex) => (
            <td
              key={column.id}
              className={cn(
                alignClass[column.align ?? "left"],
                column.hideOnMobile && "hidden md:table-cell",
                column.className,
              )}
            >
              <div
                className={cn(
                  "skeleton-block h-4",
                  columnIndex === 0 && "w-36 max-w-full",
                  columnIndex === 1 && "w-28 max-w-full",
                  columnIndex === 2 && "w-24 max-w-full",
                  columnIndex > 2 && "w-20 max-w-full",
                  column.align === "right" && "ml-auto",
                  column.align === "center" && "mx-auto",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable<TData>({
  data,
  columns,
  getRowKey,
  emptyTitle = "No records found",
  emptyDescription = "There is no data to show here yet.",
  emptyAction,
  className,
  tableClassName,
  loading = false,
  loadingRows = DEFAULT_LOADING_ROWS,
  constrained = false,
  stickyHeader = true,
  density = "comfortable",
  caption,
  onRowClick,
  getRowAriaLabel,
  rowClassName,
}: DataTableProps<TData>): React.JSX.Element {
  const skeletonRows = React.useMemo(
    () => getLoadingRows(loadingRows),
    [loadingRows],
  );

  const isClickable = typeof onRowClick === "function";

  if (!loading && data.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("table-shell", className)}
      aria-busy={loading || undefined}
      data-loading={loading ? "true" : undefined}
      data-density={density}
    >
      <div
        className={cn(
          constrained ? "table-scroll-constrained" : "table-scroll",
        )}
      >
        <table
          className={cn(
            "data-table",
            densityCellClass[density],
            !stickyHeader && "[&_thead]:static",
            tableClassName,
          )}
        >
          {caption ? <caption className="sr-only">{caption}</caption> : null}

          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    alignClass[column.align ?? "left"],
                    column.hideOnMobile && "hidden md:table-cell",
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <DataTableSkeleton columns={columns} rows={skeletonRows} />
            ) : (
              data.map((row, rowIndex) => {
                const rowKey = getRowKey(row, rowIndex);
                const ariaLabel = getRowAriaLabel?.(row, rowIndex);

                return (
                  <tr
                    key={rowKey}
                    tabIndex={isClickable ? 0 : undefined}
                    aria-label={isClickable ? ariaLabel : undefined}
                    data-clickable={isClickable ? "true" : undefined}
                    onClick={
                      isClickable
                        ? (event) => {
                            if (isInteractiveTarget(event.target)) {
                              return;
                            }

                            onRowClick(row, rowIndex);
                          }
                        : undefined
                    }
                    onKeyDown={
                      isClickable
                        ? (event) => {
                            if (
                              isInteractiveTarget(event.target) ||
                              (event.key !== "Enter" && event.key !== " ")
                            ) {
                              return;
                            }

                            event.preventDefault();
                            onRowClick(row, rowIndex);
                          }
                        : undefined
                    }
                    className={cn(
                      isClickable &&
                        "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
                      rowClassName?.(row, rowIndex),
                    )}
                  >
                    {columns.map((column) => {
                      const value = column.cell
                        ? column.cell(row, rowIndex)
                        : getAccessorValue(row, column.accessor);

                      return (
                        <td
                          key={column.id}
                          className={cn(
                            alignClass[column.align ?? "left"],
                            column.hideOnMobile && "hidden md:table-cell",
                            column.className,
                          )}
                        >
                          {value ?? "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
