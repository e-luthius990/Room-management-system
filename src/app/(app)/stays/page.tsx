// src/app/(app)/stays/page.tsx

import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
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
  kicker: string;
  title: string;
  description: string;
  emptyText: string;
} {
  switch (view) {
    case "reserved":
      return {
        kicker: "Reception check-in queue",
        title: "Check-in",
        description:
          "Reserved stays waiting for arrival confirmation. Open a stay when the guest reaches reception.",
        emptyText: "No guests are waiting for check-in.",
      };

    case "check-outs":
      return {
        kicker: "Reception check-out queue",
        title: "Check-out",
        description:
          "In-house guests who can be checked out when they leave camp accommodation.",
        emptyText: "No guests are ready for check-out.",
      };

    case "active":
      return {
        kicker: "Live stay register",
        title: "Active stays",
        description:
          "Guests currently checked in or occupying rooms across your accessible camps.",
        emptyText: "No active stays found.",
      };

    case "completed":
      return {
        kicker: "Completed stay register",
        title: "Completed stays",
        description:
          "Stay records that have already been checked out and closed.",
        emptyText: "No completed stays found.",
      };

    case "all":
      return {
        kicker: "Stay history register",
        title: "Stay history",
        description:
          "All stay records across reserved, active, completed, cancelled, and no-show states.",
        emptyText: "No stays found.",
      };

    case "current":
    default:
      return {
        kicker: "Current stay workflow",
        title: "Current stays",
        description:
          "Reserved, checked-in, and occupied stays currently moving through reception workflow.",
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

function StayViewRail({
  filters,
  activeView,
}: {
  filters: Array<{ label: string; value: StayListView }>;
  activeView: StayListView;
}): React.JSX.Element {
  return (
    <nav
      aria-label="Stay views"
      className="flex flex-wrap gap-2 border border-border bg-surface p-2 shadow-xs"
    >
      {filters.map((filter) => {
        const active = filter.value === activeView;

        return (
          <Link
            key={filter.value}
            href={viewHref(filter.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center border px-3 text-xs font-bold uppercase tracking-[0.12em] transition",
              active
                ? "border-brand-600/25 bg-brand-50 text-brand-700"
                : "border-border bg-surface-2 text-muted hover:border-border-strong hover:bg-surface hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}

function StayRow({
  stay,
}: {
  stay: Awaited<ReturnType<typeof getStays>>[number];
}): React.JSX.Element {
  return (
    <Link
      href={`/stays/${stay.id}`}
      className="block px-4 py-3 transition hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
    >
      <div className="grid gap-4 xl:grid-cols-[8.5rem_minmax(0,1.1fr)_minmax(0,0.9fr)_15rem] xl:items-start">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
            Room
          </div>

          <div className="mt-1 text-3xl font-semibold leading-8 tracking-[-0.06em] text-foreground">
            {stay.room_number}
          </div>

          <div className="mt-1 truncate text-xs leading-5 text-muted">
            {stay.building_code
              ? `${stay.building_code} · ${stay.building_name}`
              : stay.building_name}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
            Guest
          </div>

          <div className="mt-1 truncate text-sm font-semibold leading-8 text-foreground">
            {stay.guest_name}
          </div>

          <div className="mt-1 truncate text-xs leading-5 text-muted">
            {formatStayLabel(stay.guest_category)}
            {stay.guest_organization ? ` · ${stay.guest_organization}` : ""}
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
            Camp
          </div>

          <div className="mt-1 truncate text-sm font-semibold leading-8 text-foreground">
            {stay.camp_name}
          </div>

          <div className="mt-1 truncate text-xs leading-5 text-muted">
            Arrival: {formatStayDateTime(stay.expected_arrival_at)}
          </div>

          <div className="mt-1 truncate text-xs leading-5 text-muted">
            Departure: {formatStayDateTime(stay.expected_departure_at)}
          </div>

          {stay.checked_out_at ? (
            <div className="mt-1 truncate text-xs leading-5 text-muted">
              Checked out: {formatStayDateTime(stay.checked_out_at)}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 xl:text-right">
          <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
            Status
          </div>

          <div className="mt-2 flex flex-col items-start gap-1.5 xl:items-end">
            <StatusIndicator
              compact
              label={formatStayLabel(stay.status)}
              statusClassName={getStayStatusClass(stay.status)}
            />

            <span className="inline-flex min-h-7 items-center border border-border bg-surface px-2.5 text-[11px] font-bold text-muted">
              {getPrimaryActionLabel(stay.status)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
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
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">{copy.kicker}</div>

            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-[1.65rem]">
              {copy.title}
            </h1>

            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
              {copy.description}
            </p>
          </div>

          <Link href={APP_ROUTES.allocations.list} className="btn-secondary">
            Room allocation
          </Link>
        </div>
      </section>

      <StayViewRail filters={filters} activeView={view} />

      {stays.length > 0 ? (
        <section className="border border-border bg-surface shadow-xs">
          <div className="divide-y divide-border">
            {stays.map((stay) => (
              <StayRow key={stay.id} stay={stay} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          operational
          align="left"
          size="sm"
          title={copy.emptyText}
          description="Room allocation creates reserved stays. Check-in and check-out are completed from the stay detail page."
          action={
            <Link href={APP_ROUTES.allocations.list} className="btn-primary">
              Go to room allocation
            </Link>
          }
        />
      )}
    </div>
  );
}
