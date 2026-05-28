import Link from "next/link";

import { requireAuth } from "@/lib/auth/require-auth";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { hasPermission } from "@/lib/auth/permissions";
import { APP_ROUTES } from "@/lib/auth/routes";
import { EmptyState } from "@/components/ui/EmptyState";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { LinkPendingIndicator } from "@/components/navigation/link-pending-indicator";
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

function AllocationStatusRail({
  filters,
  activeStatus,
  summary,
  canCreateAllocation,
}: {
  filters: StatusFilter[];
  activeStatus: AllocationStatus | "all";
  summary: Record<AllocationStatus | "all", number>;
  canCreateAllocation: boolean;
}): React.JSX.Element {
  return (
    <section
      aria-label="Allocation register controls"
      className="border border-border bg-surface px-3 py-2.5 shadow-xs"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <nav
          aria-label="Allocation status filters"
          className="flex min-w-0 flex-wrap items-center gap-1.5"
        >
          {filters.map((filter) => {
            const active = filter.value === activeStatus;

            return (
              <Link
                key={filter.value}
                href={statusHref(filter.value)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-8 items-center gap-2 border px-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition",
                  active
                    ? "border-brand-600/30 bg-brand-50 text-brand-700 shadow-xs"
                    : "border-border bg-surface-2 text-muted hover:border-border-strong hover:bg-surface hover:text-foreground",
                )}
              >
                <span>{filter.label}</span>
                <span
                  className={cn(
                    "font-mono text-[11px] tracking-normal",
                    active ? "text-brand-700" : "text-muted",
                  )}
                >
                  {summary[filter.value]}
                </span>
              </Link>
            );
          })}
        </nav>

        {canCreateAllocation ? (
          <Link
            href={APP_ROUTES.allocations.new}
            className="btn-primary h-10 shrink-0 px-4 xl:ml-4"
          >
            Allocate room
            <LinkPendingIndicator />
          </Link>
        ) : null}
      </div>
    </section>
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
      className="block border border-border bg-surface px-4 py-3 shadow-xs transition hover:border-border-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
    >
      <div className="grid gap-4 xl:grid-cols-[8.5rem_minmax(0,1.15fr)_minmax(0,0.85fr)_15rem] xl:items-start">
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

          <div className="mt-1">
            <GuestNameWithPhoto
              guestId={allocation.guest_id}
              name={allocation.guest_name}
            />
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

function AllocationEmptyState({
  canCreateAllocation,
}: {
  canCreateAllocation: boolean;
}): React.JSX.Element {
  return (
    <EmptyState
      operational
      align="left"
      size="sm"
      title="No allocations found"
      description="Room allocations will appear here after reception assigns rooms to guests."
      action={
        canCreateAllocation ? (
          <Link href={APP_ROUTES.allocations.new} className="btn-primary">
            Allocate room
          </Link>
        ) : undefined
      }
    />
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
    getAllocations("all"),
  ]);

  const summary = getStatusSummary(allAllocations);

  const filters: StatusFilter[] = [
    {
      label: "Active",
      value: "active",
    },
    {
      label: "Checked in",
      value: "checked_in",
    },
    {
      label: "Expired",
      value: "expired",
    },
    {
      label: "Cancelled",
      value: "cancelled",
    },
    {
      label: "All",
      value: "all",
    },
  ];

  return (
    <div className="space-y-3">
      <AllocationStatusRail
        filters={filters}
        activeStatus={status}
        summary={summary}
        canCreateAllocation={canCreateAllocation}
      />

      {allocations.length === 0 ? (
        <AllocationEmptyState canCreateAllocation={canCreateAllocation} />
      ) : (
        <section className="grid gap-2" aria-label="Room allocation records">
          {allocations.map((allocation) => (
            <AllocationRowItem key={allocation.id} allocation={allocation} />
          ))}
        </section>
      )}
    </div>
  );
}
