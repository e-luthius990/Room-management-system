import Link from "next/link";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { hasPermission } from "@/lib/auth/permissions";
import { APP_ROUTES } from "@/lib/auth/routes";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";
import {
  formatAllocationDateTime,
  formatAllocationLabel,
  getAllocations,
  type AllocationStatus,
} from "@/lib/queries/allocations/allocations";

type AllocationsPageProps = {
  searchParams?: Promise<{
    status?: string;
  }>;
};

function normalizeStatus(value: string | undefined): AllocationStatus | "all" {
  if (
    value === "active" ||
    value === "checked_in" ||
    value === "cancelled" ||
    value === "expired" ||
    value === "all"
  ) {
    return value;
  }

  return "all";
}

function statusHref(status: AllocationStatus | "all"): string {
  return `${APP_ROUTES.allocations.list}?status=${status}`;
}

function getAllocationStatusClass(status: AllocationStatus): string {
  switch (status) {
    case "active":
      return "status-active";

    case "checked_in":
      return "status-checked-in";

    case "cancelled":
      return "status-cancelled";

    case "expired":
      return "status-expired";

    default:
      return "status-muted";
  }
}

export default async function AllocationsPage({
  searchParams,
}: AllocationsPageProps): Promise<React.JSX.Element> {
  await requireAnyPermission(["allocations.view"]);

  const currentUser = await requireAuth();
  const canCreateAllocation = hasPermission(currentUser, "allocations.create");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const status = normalizeStatus(resolvedSearchParams.status);
  const allocations = await getAllocations(status);

  const filters: Array<{ label: string; value: AllocationStatus | "all" }> = [
    { label: "Active", value: "active" },
    { label: "Checked in", value: "checked_in" },
    { label: "Expired", value: "expired" },
    { label: "Cancelled", value: "cancelled" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title="Room allocation"
        description="Assign vacant ready rooms to guests and keep room availability synchronized with stays."
        actions={
          canCreateAllocation ? (
            <Link href={APP_ROUTES.allocations.new} className="btn-primary">
              Allocate room
            </Link>
          ) : null
        }
      />

      <nav
        aria-label="Allocation status filters"
        className="flex flex-wrap gap-2"
      >
        {filters.map((filter) => {
          const active = filter.value === status;

          return (
            <Link
              key={filter.value}
              href={statusHref(filter.value)}
              aria-current={active ? "page" : undefined}
              className={cn("filter-chip", active && "filter-chip-active")}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      <Card variant="card">
        <CardContent className="p-0">
          {allocations.length > 0 ? (
            <div className="entity-list rounded-none border-0">
              {allocations.map((allocation) => (
                <Link
                  key={allocation.id}
                  href={APP_ROUTES.allocations.detail(allocation.id)}
                  className="entity-row group"
                >
                  <div className="grid min-w-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_auto] xl:items-center">
                    <div className="min-w-0">
                      <div className="entity-title truncate">
                        {allocation.guest_name}
                      </div>

                      <div className="entity-meta truncate">
                        {allocation.guest_organization ?? "No organization"}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        Room {allocation.room_number}
                      </div>

                      <div className="mt-1 truncate text-xs leading-5 text-muted">
                        {allocation.building_code} · {allocation.camp_name}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <StatusIndicator
                        label={formatAllocationLabel(allocation.status)}
                        statusClassName={getAllocationStatusClass(
                          allocation.status,
                        )}
                      />

                      <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted">
                        Arrival:{" "}
                        {formatAllocationDateTime(
                          allocation.expected_arrival_at,
                        )}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title="No room allocations found"
                description="Allocate a vacant ready room when reception is ready to assign accommodation."
                action={
                  canCreateAllocation ? (
                    <Link
                      href={APP_ROUTES.allocations.new}
                      className="btn-primary"
                    >
                      Allocate room
                    </Link>
                  ) : null
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
