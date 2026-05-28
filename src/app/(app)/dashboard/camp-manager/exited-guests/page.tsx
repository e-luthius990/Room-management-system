import type { JSX, ReactNode } from "react";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { getManagerExitedGuests } from "@/lib/queries/manager/get-manager-dashboard";
import { cn } from "@/lib/utils/cn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const EXITED_GUESTS_PERMISSIONS = ["stays.view_history", "stays.view"] as const;

type PageSearchParams = {
  q?: string | string[];
};

type ManagerExitedGuestsPageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

type ExitedGuestRow = Awaited<
  ReturnType<typeof getManagerExitedGuests>
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

function exitedGuestMatchesSearch(
  guest: ExitedGuestRow,
  query: string,
): boolean {
  if (!query) return true;

  const normalizedQuery = query.toLowerCase();

  return [
    guest.room_number,
    guest.guest_name,
    guest.organization,
    guest.guest_category,
    guest.stay_status,
    guest.exit_source,
    guest.departure_or_exit_time,
    guest.checked_in_at,
  ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function statusMarkerClass(value: string | null): string {
  switch (value) {
    case "completed":
    case "reception_checkout":
      return "bg-emerald-600";
    case "checked_in":
    case "occupied":
    case "security_gate_exit":
      return "bg-sky-600";
    case "transferred":
      return "bg-amber-500";
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

function ExitedGuestSearchRail({
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
      <label htmlFor="exited-guest-search" className="sr-only">
        Search exited guests
      </label>

      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <input
          id="exited-guest-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search room, guest, organization, stay status, exit source..."
          className="h-10 w-full border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-foreground"
        />

        <div className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {visibleCount} / {totalCount} exited
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

export default async function ManagerExitedGuestsPage({
  searchParams,
}: ManagerExitedGuestsPageProps): Promise<JSX.Element> {
  await requireAnyPermission([...EXITED_GUESTS_PERMISSIONS]);

  const resolvedSearchParams = await searchParams;
  const query = getSearchValue(resolvedSearchParams);

  const guests = await getManagerExitedGuests(150);
  const filteredGuests = guests.filter((guest) =>
    exitedGuestMatchesSearch(guest, query),
  );

  return (
    <div className="page-stack">
      <ExitedGuestSearchRail
        query={query}
        visibleCount={filteredGuests.length}
        totalCount={guests.length}
      />

      <section className="surface-panel overflow-hidden">
        <div className="grid border-b border-border bg-surface px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:grid-cols-[8.5rem_minmax(0,1.15fr)_12rem_13rem_14rem_14rem]">
          <div>Room</div>
          <div className="hidden xl:block">Guest</div>
          <div className="hidden xl:block">Stay</div>
          <div className="hidden xl:block">Exit source</div>
          <div className="hidden xl:block">Departure / exit</div>
          <div className="hidden xl:block">Checked in</div>
        </div>

        {filteredGuests.length === 0 ? (
          <div className="p-6 text-sm text-muted">
            {query
              ? "No exited guests match this search."
              : "No exited guests found."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredGuests.map((guest) => (
              <div
                key={[
                  guest.stay_id,
                  guest.guest_id,
                  guest.departure_or_exit_time,
                ]
                  .filter(Boolean)
                  .join("-")}
                className="grid gap-3 px-4 py-4 transition hover:bg-surface xl:grid-cols-[8.5rem_minmax(0,1.15fr)_12rem_13rem_14rem_14rem] xl:items-center"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Room
                  </div>
                  <div className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-foreground xl:mt-0">
                    {guest.room_number ?? "—"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Guest
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <GuestNameWithPhoto
                      guestId={guest.guest_id ?? ""}
                      name={guest.guest_name ?? "Unnamed guest"}
                    />

                    {guest.guest_category ? (
                      <GuestFlag>{formatLabel(guest.guest_category)}</GuestFlag>
                    ) : null}
                  </div>

                  <div className="mt-1 truncate text-xs text-muted">
                    {guest.organization ?? "—"}
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
                    Exit source
                  </div>
                  <StatusCell value={guest.exit_source} />
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Departure / exit
                  </div>
                  <div className="text-sm text-foreground">
                    {formatDateTime(guest.departure_or_exit_time)}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Checked in
                  </div>
                  <div className="text-sm text-foreground">
                    {formatDateTime(guest.checked_in_at)}
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
