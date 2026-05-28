// src/app/(app)/stays/page.tsx

import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
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

type StayRowData = Awaited<ReturnType<typeof getStays>>[number];

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

function getEmptyText(view: StayListView): string {
  switch (view) {
    case "reserved":
      return "No guests are waiting for check-in.";

    case "check-outs":
      return "No guests are ready for check-out.";

    case "active":
      return "No active stays found.";

    case "completed":
      return "No completed stays found.";

    case "all":
      return "No stays found.";

    case "current":
    default:
      return "No current stays found.";
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
      className="flex flex-wrap items-center gap-1.5"
    >
      {filters.map((filter) => {
        const active = filter.value === activeView;

        return (
          <Link
            key={filter.value}
            href={viewHref(filter.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-8 items-center border px-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition",
              active
                ? "border-brand-600/30 bg-brand-50 text-brand-700 shadow-xs"
                : "border-border bg-surface text-muted hover:border-border-strong hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}

function StayRow({ stay }: { stay: StayRowData }): React.JSX.Element {
  return (
    <Link
      href={`/stays/${stay.id}`}
      className="block border border-border bg-surface px-4 py-3 shadow-xs transition hover:border-border-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
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

          <div className="mt-1">
            <GuestNameWithPhoto
              guestId={stay.guest_id}
              name={stay.guest_name}
              photoPath={stay.guest_profile_photo_path}
              photoUpdatedAt={stay.guest_profile_photo_updated_at}
            />
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

            <div className="text-xs font-semibold leading-5 text-muted">
              {getPrimaryActionLabel(stay.status)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function StaysPage({
  searchParams,
}: StaysPageProps): Promise<React.JSX.Element> {
  noStore();

  await requirePermission("stays.view");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const view = normalizeStayListView(resolvedSearchParams.view);
  const stays = await getStays(view);

  const filters: Array<{ label: string; value: StayListView }> = [
    { label: "Check-in", value: "reserved" },
    { label: "Check-out", value: "check-outs" },
    { label: "Active", value: "active" },
    { label: "Completed", value: "completed" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="space-y-3">
      <StayViewRail filters={filters} activeView={view} />

      {stays.length > 0 ? (
        <section className="grid gap-2" aria-label="Stay records">
          {stays.map((stay) => (
            <StayRow key={stay.id} stay={stay} />
          ))}
        </section>
      ) : (
        <EmptyState
          operational
          align="left"
          size="sm"
          title={getEmptyText(view)}
          description="Room allocation creates reserved stays. Check-in and check-out are completed from the stay detail page."
        />
      )}
    </div>
  );
}
