import Link from "next/link";
import { requireAuth } from "@/lib/auth/require-auth";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { hasPermission } from "@/lib/auth/permissions";
import { APP_ROUTES } from "@/lib/auth/routes";
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

type AllocationRow = Awaited<ReturnType<typeof getAllocations>>[number];

type StatusFilter = {
  label: string;
  value: AllocationStatus | "all";
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

function getStatusSummary(
  allocations: AllocationRow[],
): Record<AllocationStatus | "all", number> {
  return allocations.reduce<Record<AllocationStatus | "all", number>>(
    (summary, allocation) => {
      summary.all += 1;
      summary[allocation.status] += 1;
      return summary;
    },
    {
      active: 0,
      checked_in: 0,
      cancelled: 0,
      expired: 0,
      all: 0,
    },
  );
}

function AllocationRegisterHeader({
  canCreateAllocation,
}: {
  canCreateAllocation: boolean;
}): React.JSX.Element {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="page-kicker">Reception allocation register</div>

          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-[1.65rem]">
            Room allocation
          </h1>

          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
            Assign vacant-ready rooms to guests and keep room availability
            synchronized with stays.
          </p>
        </div>

        {canCreateAllocation ? (
          <Link href={APP_ROUTES.allocations.new} className="btn-primary">
            Allocate room
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function AllocationStatusRail({
  filters,
  activeStatus,
  summary,
}: {
  filters: StatusFilter[];
  activeStatus: AllocationStatus | "all";
  summary: Record<AllocationStatus | "all", number>;
}): React.JSX.Element {
  return (
    <nav
      aria-label="Allocation status filters"
      className="flex flex-wrap gap-2 border border-border bg-surface p-2 shadow-xs"
    >
      {filters.map((filter) => {
        const active = filter.value === activeStatus;

        return (
          <Link
            key={filter.value}
            href={statusHref(filter.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 border px-3 text-xs font-bold uppercase tracking-[0.12em] transition",
              "rounded-md",
              active
                ? "border-brand-600/25 bg-brand-50 text-brand-700"
                : "border-border bg-surface-2 text-muted hover:border-border-strong hover:bg-surface hover:text-foreground",
            )}
          >
            <span>{filter.label}</span>
            <span className="font-semibold tracking-normal">
              {summary[filter.value]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function AllocationRowItem({
  allocation,
}: {
  allocation: AllocationRow;
}): React.JSX.Element {
  return (
    <Link
      href={APP_ROUTES.allocations.detail(allocation.id)}
      className="block px-4 py-3 transition hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
    >
      <div className="grid gap-4 xl:grid-cols-[8.5rem_minmax(0,1.1fr)_minmax(0,0.85fr)_15rem] xl:items-start">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
            Room
          </div>

          <div className="mt-1 text-3xl font-semibold leading-8 tracking-[-0.06em] text-foreground">
            {allocation.room_number}
          </div>

          <div className="mt-1 truncate text-xs leading-5 text-muted">
            {allocation.building_code}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
            Guest
          </div>

          <div className="mt-1 truncate text-sm font-semibold leading-8 text-foreground">
            {allocation.guest_name}
          </div>

          <div className="mt-1 truncate text-xs leading-5 text-muted">
            {allocation.guest_organization ?? "No organization"}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
            Camp
          </div>

          <div className="mt-1 truncate text-sm font-semibold leading-8 text-foreground">
            {allocation.camp_name}
          </div>

          <div className="mt-1 truncate text-xs leading-5 text-muted">
            {allocation.building_code}
          </div>
        </div>

        <div className="min-w-0 xl:text-right">
          <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
            Status
          </div>

          <div className="mt-2 flex flex-col items-start gap-1.5 xl:items-end">
            <StatusIndicator
              compact
              label={formatAllocationLabel(allocation.status)}
              statusClassName={getAllocationStatusClass(allocation.status)}
            />

            <StatusIndicator
              compact
              withDot={false}
              tone="muted"
              label={formatAllocationDateTime(allocation.expected_arrival_at)}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function AllocationsPage({
  searchParams,
}: AllocationsPageProps): Promise<React.JSX.Element> {
  await requireAnyPermission(["allocations.view"]);

  const currentUser = await requireAuth();
  const canCreateAllocation = hasPermission(currentUser, "allocations.create");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const status = normalizeStatus(resolvedSearchParams.status);

  const [allocations, allAllocations] = await Promise.all([
    getAllocations(status),
    status === "all" ? getAllocations("all") : getAllocations("all"),
  ]);

  const summary = getStatusSummary(allAllocations);

  const filters: StatusFilter[] = [
    { label: "Active", value: "active" },
    { label: "Checked in", value: "checked_in" },
    { label: "Expired", value: "expired" },
    { label: "Cancelled", value: "cancelled" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="page-stack">
      <AllocationRegisterHeader canCreateAllocation={canCreateAllocation} />

      <AllocationStatusRail
        filters={filters}
        activeStatus={status}
        summary={summary}
      />

      <Card variant="console">
        <CardContent className="p-0">
          {allocations.length > 0 ? (
            <div className="divide-y divide-border">
              {allocations.map((allocation) => (
                <AllocationRowItem
                  key={allocation.id}
                  allocation={allocation}
                />
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                operational
                align="left"
                size="sm"
                title="No room allocations found"
                description="Allocate a vacant-ready room when reception is ready to assign accommodation."
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
