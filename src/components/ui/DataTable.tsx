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
  className?: string;
  tableClassName?: string;
  loading?: boolean;
  loadingRows?: number;
  onRowClick?: (row: TData, index: number) => void;
  rowClassName?: (row: TData, index: number) => string | undefined;
};

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

function getAccessorValue<TData>(
  row: TData,
  accessor: keyof TData | undefined,
): React.ReactNode {
  if (!accessor) return null;

  const value = row[accessor];

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (value == null) {
    return "—";
  }

  return String(value);
}

function DataTableSkeleton({
  columns,
  rows,
}: {
  columns: readonly DataTableColumn<unknown>[];
  rows: number;
}): React.JSX.Element {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {columns.map((column) => (
            <td
              key={column.id}
              className={cn(
                alignClass[column.align ?? "left"],
                column.hideOnMobile && "hidden md:table-cell",
                column.className,
              )}
            >
              <div className="h-4 w-full max-w-32 animate-pulse rounded-full bg-surface-3" />
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
  className,
  tableClassName,
  loading = false,
  loadingRows = 5,
  onRowClick,
  rowClassName,
}: DataTableProps<TData>): React.JSX.Element {
  if (!loading && data.length === 0) {
    return (
      <div className={className}>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={cn("table-shell", className)}>
      <div className="table-scroll">
        <table className={cn("data-table", tableClassName)}>
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
              <DataTableSkeleton
                columns={columns as readonly DataTableColumn<unknown>[]}
                rows={loadingRows}
              />
            ) : (
              data.map((row, rowIndex) => {
                const clickable = Boolean(onRowClick);

                return (
                  <tr
                    key={getRowKey(row, rowIndex)}
                    tabIndex={clickable ? 0 : undefined}
                    role={clickable ? "button" : undefined}
                    onClick={
                      onRowClick ? () => onRowClick(row, rowIndex) : undefined
                    }
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onRowClick(row, rowIndex);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      clickable &&
                        "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
                      rowClassName?.(row, rowIndex),
                    )}
                  >
                    {columns.map((column) => {
                      const value =
                        column.cell?.(row, rowIndex) ??
                        getAccessorValue(row, column.accessor);

                      return (
                        <td
                          key={column.id}
                          className={cn(
                            alignClass[column.align ?? "left"],
                            column.hideOnMobile && "hidden md:table-cell",
                            column.className,
                          )}
                        >
                          {value}
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
