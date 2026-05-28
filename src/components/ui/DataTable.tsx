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

export type DataTableFrame = "panel" | "attached" | "bare";

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
  constrained?: boolean;
  stickyHeader?: boolean;
  density?: "comfortable" | "compact";
  frame?: DataTableFrame;
  caption?: React.ReactNode;
  onRowClick?: (row: TData, index: number) => void;
  getRowAriaLabel?: (row: TData, index: number) => string;
  rowClassName?: (row: TData, index: number) => string | undefined;
  rowAttributes?: (
    row: TData,
    index: number,
  ) => Record<string, string | undefined>;
  getRowStatus?: (row: TData, index: number) => string | undefined;
  selectedRowKey?: React.Key | null;
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

const frameClass: Record<DataTableFrame, string> = {
  panel: "table-shell",
  attached: "border-x border-b border-border bg-surface",
  bare: "",
};

function getScrollClass(frame: DataTableFrame, constrained: boolean): string {
  if (frame === "panel") {
    return constrained ? "table-scroll-constrained" : "table-scroll";
  }

  return cn(
    "w-full overflow-x-auto",
    constrained && "max-h-[min(720px,calc(100vh-16rem))] overflow-auto",
  );
}

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
  constrained = false,
  stickyHeader = true,
  density = "comfortable",
  frame = "panel",
  caption,
  onRowClick,
  getRowAriaLabel,
  rowClassName,
  rowAttributes,
  getRowStatus,
  selectedRowKey = null,
}: DataTableProps<TData>): React.JSX.Element {
  const isClickable = typeof onRowClick === "function";

  if (data.length === 0) {
    return (
      <div
        className={cn(frameClass[frame], frame !== "bare" && "p-4", className)}
        aria-busy={loading || undefined}
        data-loading={loading ? "true" : undefined}
        data-density={density}
        data-frame={frame}
      >
        <EmptyState
          operational
          align="left"
          tone="neutral"
          size="sm"
          title={loading ? "Preparing records" : emptyTitle}
          description={
            loading
              ? "This view will update automatically when records are available."
              : emptyDescription
          }
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(frameClass[frame], className)}
      aria-busy={loading || undefined}
      data-loading={loading ? "true" : undefined}
      data-density={density}
      data-frame={frame}
    >
      <div className={getScrollClass(frame, constrained)}>
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
            {data.map((row, rowIndex) => {
              const rowKey = getRowKey(row, rowIndex);
              const ariaLabel = getRowAriaLabel?.(row, rowIndex);
              const rowStatus = getRowStatus?.(row, rowIndex);
              const additionalRowAttributes = rowAttributes?.(row, rowIndex);
              const isSelected =
                selectedRowKey != null &&
                String(selectedRowKey) === String(rowKey);

              return (
                <tr
                  key={rowKey}
                  tabIndex={isClickable ? 0 : undefined}
                  aria-label={isClickable ? ariaLabel : undefined}
                  aria-selected={isSelected || undefined}
                  data-clickable={isClickable ? "true" : undefined}
                  data-selected={isSelected ? "true" : undefined}
                  data-row-status={rowStatus}
                  {...additionalRowAttributes}
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
