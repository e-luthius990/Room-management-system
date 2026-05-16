// src/app/(app)/stays/page.tsx

import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";
import {
  formatStayDateTime,
  formatStayLabel,
  getStays,
  normalizeStayListView,
  type StayListView,
} from "@/lib/queries/stays/get-stays";

type StaysPageProps = {
  searchParams?: Promise<{
    view?: string;
  }>;
};

function getStayStatusClass(status: string): string {
  switch (status) {
    case "occupied":
    case "checked_in":
      return "status-occupied";

    case "reserved":
      return "status-reserved";

    case "completed":
      return "status-vacant-ready";

    case "cancelled":
    case "no_show":
      return "status-muted";

    case "transferred":
      return "status-reserved";

    default:
      return "status-muted";
  }
}

function getPageCopy(view: StayListView): {
  title: string;
  description: string;
  emptyText: string;
} {
  switch (view) {
    case "reserved":
      return {
        title: "Check-in",
        description:
          "Guests with allocated rooms waiting for arrival confirmation.",
        emptyText: "No guests are waiting for check-in.",
      };

    case "check-outs":
      return {
        title: "Check-out",
        description:
          "Guests currently in-house who can be checked out when they leave.",
        emptyText: "No guests are ready for check-out.",
      };

    case "active":
      return {
        title: "Active stays",
        description: "Guests currently checked in or occupying rooms.",
        emptyText: "No active stays found.",
      };

    case "completed":
      return {
        title: "Completed stays",
        description: "Stay records that have already been checked out.",
        emptyText: "No completed stays found.",
      };

    case "all":
      return {
        title: "Stay history",
        description: "All stay records across check-in and check-out states.",
        emptyText: "No stays found.",
      };

    case "current":
    default:
      return {
        title: "Current stays",
        description:
          "Reserved, checked-in, and occupied stays currently in workflow.",
        emptyText: "No current stays found.",
      };
  }
}

function getPrimaryActionLabel(status: string): string {
  if (status === "reserved") {
    return "Check in";
  }

  if (status === "checked_in" || status === "occupied") {
    return "Check out";
  }

  if (status === "completed") {
    return "Checked out";
  }

  return "Open";
}

function viewHref(view: StayListView): string {
  return `/stays?view=${view}`;
}

export default async function StaysPage({
  searchParams,
}: StaysPageProps): Promise<React.JSX.Element> {
  await requirePermission("stays.view");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const view = normalizeStayListView(resolvedSearchParams.view);
  const copy = getPageCopy(view);
  const stays = await getStays(view);

  const filters: Array<{ label: string; value: StayListView }> = [
    { label: "Check-in", value: "reserved" },
    { label: "Check-out", value: "check-outs" },
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="page-stack">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Link href="/allocations" className="btn-secondary">
            Room allocation
          </Link>
        }
      />

      <nav aria-label="Stay views" className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = filter.value === view;

          return (
            <Link
              key={filter.value}
              href={viewHref(filter.value)}
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
          {stays.length > 0 ? (
            <div className="entity-list rounded-none border-0">
              {stays.map((stay) => (
                <Link
                  key={stay.id}
                  href={`/stays/${stay.id}`}
                  className="entity-row group"
                >
                  <div className="grid min-w-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] xl:items-center">
                    <div className="min-w-0">
                      <div className="entity-title truncate">
                        {stay.guest_name}
                      </div>

                      <div className="entity-meta truncate">
                        {formatStayLabel(stay.guest_category)}
                        {stay.guest_organization
                          ? ` · ${stay.guest_organization}`
                          : ""}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        Room {stay.room_number}
                      </div>

                      <div className="mt-1 truncate text-xs leading-5 text-muted">
                        {stay.building_code
                          ? `${stay.building_code} · ${stay.building_name}`
                          : stay.building_name}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {stay.camp_name}
                      </div>

                      <div className="mt-1 text-xs text-muted">
                        Arrival: {formatStayDateTime(stay.expected_arrival_at)}
                      </div>

                      <div className="mt-1 text-xs text-muted">
                        Departure:{" "}
                        {formatStayDateTime(stay.expected_departure_at)}
                      </div>

                      {stay.checked_out_at ? (
                        <div className="mt-1 text-xs text-muted">
                          Checked out: {formatStayDateTime(stay.checked_out_at)}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <StatusIndicator
                        label={formatStayLabel(stay.status)}
                        statusClassName={getStayStatusClass(stay.status)}
                      />

                      <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted">
                        {getPrimaryActionLabel(stay.status)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title={copy.emptyText}
                description="Room allocation creates reserved stays. Check-in and check-out are completed from the stay detail page."
                action={
                  <Link href="/allocations" className="btn-primary">
                    Go to room allocation
                  </Link>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
