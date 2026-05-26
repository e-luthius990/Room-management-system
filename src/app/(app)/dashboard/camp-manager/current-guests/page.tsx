import type { JSX, ReactNode } from "react";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { getManagerCurrentGuests } from "@/lib/queries/manager/get-manager-dashboard";
import { cn } from "@/lib/utils/cn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CURRENT_GUESTS_PERMISSIONS = [
  "stays.view_current",
  "stays.view",
] as const;

type PageSearchParams = {
  q?: string | string[];
};

type ManagerCurrentGuestsPageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

type CurrentGuestRow = Awaited<
  ReturnType<typeof getManagerCurrentGuests>
>[number];

function getSearchValue(searchParams?: PageSearchParams): string {
  const value = searchParams?.q;

  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatLabel(value: string | null): string {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function currentGuestMatchesSearch(
  guest: CurrentGuestRow,
  query: string,
): boolean {
  if (!query) return true;

  const normalizedQuery = query.toLowerCase();

  return [
    guest.room_number,
    guest.guest_name,
    guest.camp_name,
    guest.organization,
    guest.guest_category,
    guest.stay_status,
    guest.security_presence_status,
    guest.arrival_time,
    guest.expected_departure_at,
  ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function statusMarkerClass(value: string | null): string {
  switch (value) {
    case "checked_in":
    case "occupied":
    case "in_camp":
      return "bg-emerald-600";
    case "reserved":
    case "sent_to_reception":
      return "bg-sky-600";
    case "pending_checkout":
      return "bg-amber-500";
    case "completed":
    case "exited":
      return "bg-neutral-500";
    case "cancelled":
    case "no_show":
      return "bg-red-600";
    default:
      return "bg-neutral-400";
  }
}

function StatusCell({
  value,
  children,
}: {
  value: string | null;
  children?: ReactNode;
}): JSX.Element {
  return (
    <div className="inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground">
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 border border-background",
          statusMarkerClass(value),
        )}
      />
      <span>{children ?? formatLabel(value)}</span>
    </div>
  );
}

function CurrentGuestSearchRail({
  query,
  visibleCount,
  totalCount,
}: {
  query: string;
  visibleCount: number;
  totalCount: number;
}): JSX.Element {
  return (
    <form action="" className="ops-command">
      <label htmlFor="current-guest-search" className="sr-only">
        Search current guests
      </label>

      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <input
          id="current-guest-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search room, guest, camp, organization, status..."
          className="h-10 w-full border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-foreground"
        />

        <div className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {visibleCount} / {totalCount} guests
        </div>
      </div>
    </form>
  );
}

function GuestFlag({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="border border-border bg-surface px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
      {children}
    </span>
  );
}

export default async function ManagerCurrentGuestsPage({
  searchParams,
}: ManagerCurrentGuestsPageProps): Promise<JSX.Element> {
  await requireAnyPermission([...CURRENT_GUESTS_PERMISSIONS]);

  const resolvedSearchParams = await searchParams;
  const query = getSearchValue(resolvedSearchParams);

  const guests = await getManagerCurrentGuests(150);
  const filteredGuests = guests.filter((guest) =>
    currentGuestMatchesSearch(guest, query),
  );

  return (
    <div className="page-stack">
      <CurrentGuestSearchRail
        query={query}
        visibleCount={filteredGuests.length}
        totalCount={guests.length}
      />

      <section className="surface-panel overflow-hidden">
        <div className="grid border-b border-border bg-surface px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:grid-cols-[8.5rem_minmax(0,1.15fr)_minmax(0,0.9fr)_12rem_12rem_14rem]">
          <div>Room</div>
          <div className="hidden xl:block">Guest</div>
          <div className="hidden xl:block">Camp</div>
          <div className="hidden xl:block">Stay</div>
          <div className="hidden xl:block">Presence</div>
          <div className="hidden xl:block">Expected departure</div>
        </div>

        {filteredGuests.length === 0 ? (
          <div className="p-6 text-sm text-muted">
            {query
              ? "No checked-in guests match this search."
              : "No guests are currently checked in."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGuests.map((guest) => (
              <div
                key={guest.stay_id ?? guest.guest_id ?? guest.guest_name}
                className="grid gap-3 px-4 py-4 transition hover:bg-surface xl:grid-cols-[8.5rem_minmax(0,1.15fr)_minmax(0,0.9fr)_12rem_12rem_14rem] xl:items-center"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Room
                  </div>
                  <div className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-foreground xl:mt-0">
                    {guest.room_number ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {formatDateTime(guest.arrival_time)}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Guest
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {guest.guest_name ?? "Unnamed guest"}
                    </div>

                    {guest.is_vip ? <GuestFlag>VIP</GuestFlag> : null}
                  </div>

                  <div className="mt-1 truncate text-xs text-muted">
                    {[guest.organization, formatLabel(guest.guest_category)]
                      .filter((value) => value && value !== "—")
                      .join(" · ") || "—"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Camp
                  </div>
                  <div className="truncate text-sm font-medium text-foreground">
                    {guest.camp_name ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Stay
                  </div>
                  <StatusCell value={guest.stay_status} />
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Presence
                  </div>
                  <StatusCell value={guest.security_presence_status} />
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Expected departure
                  </div>
                  <div className="text-sm text-foreground">
                    {formatDateTime(guest.expected_departure_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
