import type { JSX } from "react";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const AVAILABLE_ROOMS_PERMISSIONS = ["rooms.view", "rooms.view_board"] as const;

type PageSearchParams = {
  q?: string | string[];
};

type AvailableRoomRow = {
  room_id: string | null;
  room_number: string | null;
  camp_id: string | null;
  camp_name: string | null;
  building_id: string | null;
  building_name: string | null;
  room_type: string | null;
  capacity: number | null;
  current_status: string | null;
  condition_status: string | null;
  is_vip: boolean | null;
  is_delegate_suitable: boolean | null;
};

type ManagerAvailableRoomsPageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

function getSearchValue(searchParams?: PageSearchParams): string {
  const value = searchParams?.q;

  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }

  return value?.trim() ?? "";
}

function roomMatchesSearch(room: AvailableRoomRow, query: string): boolean {
  if (!query) return true;

  const normalizedQuery = query.toLowerCase();

  return [
    room.room_number,
    room.camp_name,
    room.building_name,
    room.room_type,
    room.current_status,
    room.condition_status,
    room.capacity?.toString() ?? null,
  ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function formatLabel(value: string | null): string {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusMarkerClass(value: string | null): string {
  switch (value) {
    case "vacant_ready":
      return "bg-emerald-600";
    case "reserved":
      return "bg-amber-500";
    case "manager_hold":
      return "bg-neutral-500";
    case "out_of_service":
      return "bg-red-600";
    default:
      return "bg-neutral-400";
  }
}

function StatusCell({ status }: { status: string | null }): JSX.Element {
  return (
    <div className="inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground">
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 border border-background",
          statusMarkerClass(status),
        )}
      />
      <span>{formatLabel(status)}</span>
    </div>
  );
}

function SuitabilityFlags({
  isVip,
  isDelegateSuitable,
}: {
  isVip: boolean | null;
  isDelegateSuitable: boolean | null;
}): JSX.Element {
  if (!isVip && !isDelegateSuitable) {
    return <span className="text-sm text-muted">Standard room</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {isVip ? (
        <span className="border border-border bg-surface px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
          VIP
        </span>
      ) : null}

      {isDelegateSuitable ? (
        <span className="border border-border bg-surface px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
          Delegate
        </span>
      ) : null}
    </div>
  );
}

function RoomSearchRail({
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
      <label htmlFor="room-search" className="sr-only">
        Search available rooms
      </label>

      <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <input
          id="room-search"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search room number"
          className="h-10 w-full border border-border bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-foreground"
        />

        <div className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {visibleCount} / {totalCount} rooms
        </div>
      </div>
    </form>
  );
}

async function getAvailableRooms(): Promise<AvailableRoomRow[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("room_board_view")
    .select(
      [
        "room_id",
        "room_number",
        "camp_id",
        "camp_name",
        "building_id",
        "building_name",
        "room_type",
        "capacity",
        "current_status",
        "condition_status",
        "is_vip",
        "is_delegate_suitable",
      ].join(","),
    )
    .eq("current_status", "vacant_ready")
    .order("room_number", { ascending: true })
    .returns<AvailableRoomRow[]>();

  if (error) {
    throw new Error(`Failed to load available rooms: ${error.message}`);
  }

  return data ?? [];
}

export default async function ManagerAvailableRoomsPage({
  searchParams,
}: ManagerAvailableRoomsPageProps): Promise<JSX.Element> {
  await requireAnyPermission([...AVAILABLE_ROOMS_PERMISSIONS]);

  const resolvedSearchParams = await searchParams;
  const query = getSearchValue(resolvedSearchParams);
  const rooms = await getAvailableRooms();
  const filteredRooms = rooms.filter((room) => roomMatchesSearch(room, query));

  return (
    <div className="page-stack">
      <RoomSearchRail
        query={query}
        visibleCount={filteredRooms.length}
        totalCount={rooms.length}
      />

      <section className="surface-panel overflow-hidden">
        <div className="grid border-b border-border bg-surface px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:grid-cols-[8.5rem_minmax(0,1.1fr)_minmax(0,0.9fr)_10rem_14rem_11rem]">
          <div>Room</div>
          <div className="hidden xl:block">Camp</div>
          <div className="hidden xl:block">Building</div>
          <div className="hidden xl:block">Capacity</div>
          <div className="hidden xl:block">Suitability</div>
          <div className="hidden xl:block">Status</div>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="p-6 text-sm text-muted">
            {query
              ? "No available rooms match this search."
              : "No rooms are currently available."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredRooms.map((room) => (
              <div
                key={room.room_id ?? room.room_number}
                className="grid gap-3 px-4 py-4 transition hover:bg-surface xl:grid-cols-[8.5rem_minmax(0,1.1fr)_minmax(0,0.9fr)_10rem_14rem_11rem] xl:items-center"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Room
                  </div>
                  <div className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-foreground xl:mt-0">
                    {room.room_number ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {room.room_type ?? "Room"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Camp
                  </div>
                  <div className="truncate text-sm font-medium text-foreground">
                    {room.camp_name ?? "—"}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Building
                  </div>
                  <div className="truncate text-sm text-muted">
                    {room.building_name ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Capacity
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {room.capacity ?? "—"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Suitability
                  </div>
                  <SuitabilityFlags
                    isVip={room.is_vip}
                    isDelegateSuitable={room.is_delegate_suitable}
                  />
                </div>

                <div className="xl:flex xl:justify-end">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted xl:hidden">
                    Status
                  </div>
                  <StatusCell status={room.current_status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
