import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ManagerRoomSummaryRow = {
  camp_id: string | null;
  total_rooms: number | null;
  available_rooms: number | null;
  occupied_rooms: number | null;
};

export type ManagerCurrentGuestRow = {
  stay_id: string | null;
  camp_id: string | null;
  camp_name: string | null;
  room_id: string | null;
  room_number: string | null;
  guest_id: string | null;
  guest_name: string | null;
  guest_category: string | null;
  organization: string | null;
  is_vip: boolean | null;
  stay_status: string | null;
  arrival_time: string | null;
  expected_departure_at: string | null;
  security_event_id: string | null;
  security_entry_at: string | null;
  security_exit_at: string | null;
  security_last_seen_at: string | null;
  security_presence_status: string | null;
};

export type ManagerExitedGuestRow = {
  stay_id: string | null;
  camp_id: string | null;
  guest_id: string | null;
  guest_name: string | null;
  guest_category: string | null;
  organization: string | null;
  room_id: string | null;
  room_number: string | null;
  stay_status: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  security_exit_at: string | null;
  departure_or_exit_time: string | null;
  exit_source: string | null;
};

type ViewDefinition<Row> = {
  Row: Row;
  Insert: never;
  Update: never;
  Relationships: [];
};

type ManagerDashboardDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: {
      manager_room_summary_view: ViewDefinition<ManagerRoomSummaryRow>;
      manager_current_guests_view: ViewDefinition<ManagerCurrentGuestRow>;
      manager_exited_guests_view: ViewDefinition<ManagerExitedGuestRow>;
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type ManagerDashboardData = {
  fetchedAt: string;
  rooms: {
    total: number;
    available: number;
    occupied: number;
  };
  currentGuests: ManagerCurrentGuestRow[];
  exitedGuests: ManagerExitedGuestRow[];
};

function getTypedClient(
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): SupabaseClient<ManagerDashboardDatabase> {
  return client as unknown as SupabaseClient<ManagerDashboardDatabase>;
}

function toNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function requireData<T>(
  data: T | null,
  error: { message: string } | null,
  source: string,
): T {
  if (error) {
    throw new Error(`Failed to load ${source}: ${error.message}`);
  }

  if (data === null) {
    throw new Error(`Failed to load ${source}.`);
  }

  return data;
}

export async function getManagerDashboardData(): Promise<ManagerDashboardData> {
  noStore();

  const supabase = getTypedClient(await createServerSupabaseClient());

  const [roomSummaryResult, currentGuestsResult, exitedGuestsResult] =
    await Promise.all([
      supabase
        .from("manager_room_summary_view")
        .select("camp_id,total_rooms,available_rooms,occupied_rooms"),

      supabase
        .from("manager_current_guests_view")
        .select(
          [
            "stay_id",
            "camp_id",
            "camp_name",
            "room_id",
            "room_number",
            "guest_id",
            "guest_name",
            "guest_category",
            "organization",
            "is_vip",
            "stay_status",
            "arrival_time",
            "expected_departure_at",
            "security_event_id",
            "security_entry_at",
            "security_exit_at",
            "security_last_seen_at",
            "security_presence_status",
          ].join(","),
        )
        .order("arrival_time", { ascending: false, nullsFirst: false })
        .limit(10),

      supabase
        .from("manager_exited_guests_view")
        .select(
          [
            "stay_id",
            "camp_id",
            "guest_id",
            "guest_name",
            "guest_category",
            "organization",
            "room_id",
            "room_number",
            "stay_status",
            "checked_in_at",
            "checked_out_at",
            "security_exit_at",
            "departure_or_exit_time",
            "exit_source",
          ].join(","),
        )
        .order("departure_or_exit_time", {
          ascending: false,
          nullsFirst: false,
        })
        .limit(10),
    ]);

  const roomRows = requireData(
    roomSummaryResult.data,
    roomSummaryResult.error,
    "manager room summary",
  );

  const currentGuests = requireData(
    currentGuestsResult.data,
    currentGuestsResult.error,
    "current guests",
  );

  const exitedGuests = requireData(
    exitedGuestsResult.data,
    exitedGuestsResult.error,
    "exited guests",
  );

  const rooms = roomRows.reduce(
    (summary, row) => {
      summary.total += toNumber(row.total_rooms);
      summary.available += toNumber(row.available_rooms);
      summary.occupied += toNumber(row.occupied_rooms);
      return summary;
    },
    {
      total: 0,
      available: 0,
      occupied: 0,
    },
  );

  return {
    fetchedAt: new Date().toISOString(),
    rooms,
    currentGuests,
    exitedGuests,
  };
}

export async function getManagerCurrentGuests(
  limit = 100,
): Promise<ManagerCurrentGuestRow[]> {
  noStore();

  const supabase = getTypedClient(await createServerSupabaseClient());

  const { data, error } = await supabase
    .from("manager_current_guests_view")
    .select(
      [
        "stay_id",
        "camp_id",
        "camp_name",
        "room_id",
        "room_number",
        "guest_id",
        "guest_name",
        "guest_category",
        "organization",
        "is_vip",
        "stay_status",
        "arrival_time",
        "expected_departure_at",
        "security_event_id",
        "security_entry_at",
        "security_exit_at",
        "security_last_seen_at",
        "security_presence_status",
      ].join(","),
    )
    .order("arrival_time", { ascending: false, nullsFirst: false })
    .limit(limit);

  return requireData(data, error, "current guests");
}

export async function getManagerExitedGuests(
  limit = 100,
): Promise<ManagerExitedGuestRow[]> {
  noStore();

  const supabase = getTypedClient(await createServerSupabaseClient());

  const { data, error } = await supabase
    .from("manager_exited_guests_view")
    .select(
      [
        "stay_id",
        "camp_id",
        "guest_id",
        "guest_name",
        "guest_category",
        "organization",
        "room_id",
        "room_number",
        "stay_status",
        "checked_in_at",
        "checked_out_at",
        "security_exit_at",
        "departure_or_exit_time",
        "exit_source",
      ].join(","),
    )
    .order("departure_or_exit_time", {
      ascending: false,
      nullsFirst: false,
    })
    .limit(limit);

  return requireData(data, error, "exited guests");
}