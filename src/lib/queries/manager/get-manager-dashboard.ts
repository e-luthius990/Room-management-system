import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CurrentUserContext } from "@/lib/auth/types";

type NumericDbValue = number | string | null;

export type ManagerRoomSummaryRow = {
  camp_id: string | null;
  total_rooms: NumericDbValue;
  available_rooms: NumericDbValue;
  occupied_rooms: NumericDbValue;
  camp_name: string | null;
  reserved_rooms: NumericDbValue;
  pending_check_in_rooms: NumericDbValue;
  pending_checkout_rooms: NumericDbValue;
  out_of_service_rooms: NumericDbValue;
  manager_hold_rooms: NumericDbValue;
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

export type ManagerCampSummary = {
  campId: string;
  campName: string;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  pendingCheckInRooms: number;
  pendingCheckoutRooms: number;
  outOfServiceRooms: number;
  managerHoldRooms: number;
  occupancyRate: number;
  availabilityRate: number;
  currentGuests: number;
  vipGuests: number;
  dueDepartures: number;
};

export type ManagerOperationalSummary = {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  pendingCheckInRooms: number;
  pendingCheckoutRooms: number;
  outOfServiceRooms: number;
  managerHoldRooms: number;
  occupancyRate: number;
  availabilityRate: number;
  currentGuests: number;
  vipGuests: number;
  guestsInsideCamp: number;
  guestsExitedSecurity: number;
  dueDepartures: number;
  recentlyExitedGuests: number;
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

  summary: ManagerOperationalSummary;
  camps: ManagerCampSummary[];
  currentGuests: ManagerCurrentGuestRow[];
  exitedGuests: ManagerExitedGuestRow[];
};

type RpcError = {
  message: string;
};

type ManagerDashboardRpcClient = {
  rpc(
    fn: "get_manager_dashboard_snapshot",
    args: {
      p_camp_ids: string[] | null;
      p_current_guest_limit: number;
      p_exited_guest_limit: number;
      p_now_at: string;
    },
  ): Promise<{
    data: unknown;
    error: RpcError | null;
  }>;
};

const CURRENT_GUEST_LIMIT = 12;
const EXITED_GUEST_LIMIT = 12;

const CURRENT_GUEST_COLUMNS = [
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
] as const;

const EXITED_GUEST_COLUMNS = [
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
] as const;

function getTypedClient(
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): SupabaseClient<ManagerDashboardDatabase> {
  return client as unknown as SupabaseClient<ManagerDashboardDatabase>;
}

function getManagerCampIds(currentUser: CurrentUserContext): string[] | null {
  if (currentUser.isSystemActor) {
    return null;
  }

  const campIds = currentUser.campAccess
    .map((access) => access.camp_id)
    .filter(
      (campId): campId is string =>
        typeof campId === "string" && campId.length > 0,
    );

  return [...new Set(campIds)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : fallback;
}

function nullableTextValue(value: unknown): string | null {
  const normalized = textValue(value);

  return normalized.length > 0 ? normalized : null;
}

function numberValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
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

function parseRooms(value: unknown): ManagerDashboardData["rooms"] {
  const rooms = asRecord(value);

  return {
    total: numberValue(rooms.total),
    available: numberValue(rooms.available),
    occupied: numberValue(rooms.occupied),
  };
}

function parseSummary(value: unknown): ManagerOperationalSummary {
  const summary = asRecord(value);

  return {
    totalRooms: numberValue(summary.totalRooms),
    availableRooms: numberValue(summary.availableRooms),
    occupiedRooms: numberValue(summary.occupiedRooms),
    reservedRooms: numberValue(summary.reservedRooms),
    pendingCheckInRooms: numberValue(summary.pendingCheckInRooms),
    pendingCheckoutRooms: numberValue(summary.pendingCheckoutRooms),
    outOfServiceRooms: numberValue(summary.outOfServiceRooms),
    managerHoldRooms: numberValue(summary.managerHoldRooms),
    occupancyRate: numberValue(summary.occupancyRate),
    availabilityRate: numberValue(summary.availabilityRate),
    currentGuests: numberValue(summary.currentGuests),
    vipGuests: numberValue(summary.vipGuests),
    guestsInsideCamp: numberValue(summary.guestsInsideCamp),
    guestsExitedSecurity: numberValue(summary.guestsExitedSecurity),
    dueDepartures: numberValue(summary.dueDepartures),
    recentlyExitedGuests: numberValue(summary.recentlyExitedGuests),
  };
}

function parseCampSummary(value: unknown): ManagerCampSummary | null {
  const camp = asRecord(value);
  const campId = textValue(camp.campId, "unassigned");
  const campName = textValue(camp.campName, "Unassigned camp");

  if (!campId || !campName) {
    return null;
  }

  return {
    campId,
    campName,
    totalRooms: numberValue(camp.totalRooms),
    availableRooms: numberValue(camp.availableRooms),
    occupiedRooms: numberValue(camp.occupiedRooms),
    reservedRooms: numberValue(camp.reservedRooms),
    pendingCheckInRooms: numberValue(camp.pendingCheckInRooms),
    pendingCheckoutRooms: numberValue(camp.pendingCheckoutRooms),
    outOfServiceRooms: numberValue(camp.outOfServiceRooms),
    managerHoldRooms: numberValue(camp.managerHoldRooms),
    occupancyRate: numberValue(camp.occupancyRate),
    availabilityRate: numberValue(camp.availabilityRate),
    currentGuests: numberValue(camp.currentGuests),
    vipGuests: numberValue(camp.vipGuests),
    dueDepartures: numberValue(camp.dueDepartures),
  };
}

function parseCurrentGuest(value: unknown): ManagerCurrentGuestRow | null {
  const guest = asRecord(value);

  return {
    stay_id: nullableTextValue(guest.stay_id),
    camp_id: nullableTextValue(guest.camp_id),
    camp_name: nullableTextValue(guest.camp_name),
    room_id: nullableTextValue(guest.room_id),
    room_number: nullableTextValue(guest.room_number),
    guest_id: nullableTextValue(guest.guest_id),
    guest_name: nullableTextValue(guest.guest_name),
    guest_category: nullableTextValue(guest.guest_category),
    organization: nullableTextValue(guest.organization),
    is_vip: booleanOrNull(guest.is_vip),
    stay_status: nullableTextValue(guest.stay_status),
    arrival_time: nullableTextValue(guest.arrival_time),
    expected_departure_at: nullableTextValue(guest.expected_departure_at),
    security_event_id: nullableTextValue(guest.security_event_id),
    security_entry_at: nullableTextValue(guest.security_entry_at),
    security_exit_at: nullableTextValue(guest.security_exit_at),
    security_last_seen_at: nullableTextValue(guest.security_last_seen_at),
    security_presence_status: nullableTextValue(guest.security_presence_status),
  };
}

function parseExitedGuest(value: unknown): ManagerExitedGuestRow | null {
  const guest = asRecord(value);

  return {
    stay_id: nullableTextValue(guest.stay_id),
    camp_id: nullableTextValue(guest.camp_id),
    guest_id: nullableTextValue(guest.guest_id),
    guest_name: nullableTextValue(guest.guest_name),
    guest_category: nullableTextValue(guest.guest_category),
    organization: nullableTextValue(guest.organization),
    room_id: nullableTextValue(guest.room_id),
    room_number: nullableTextValue(guest.room_number),
    stay_status: nullableTextValue(guest.stay_status),
    checked_in_at: nullableTextValue(guest.checked_in_at),
    checked_out_at: nullableTextValue(guest.checked_out_at),
    security_exit_at: nullableTextValue(guest.security_exit_at),
    departure_or_exit_time: nullableTextValue(guest.departure_or_exit_time),
    exit_source: nullableTextValue(guest.exit_source),
  };
}

function parseManagerDashboardData(value: unknown): ManagerDashboardData {
  const root = asRecord(value);

  return {
    fetchedAt: textValue(root.fetchedAt, new Date().toISOString()),
    rooms: parseRooms(root.rooms),
    summary: parseSummary(root.summary),
    camps: asArray(root.camps).flatMap((item) => {
      const parsed = parseCampSummary(item);

      return parsed ? [parsed] : [];
    }),
    currentGuests: asArray(root.currentGuests).flatMap((item) => {
      const parsed = parseCurrentGuest(item);

      return parsed ? [parsed] : [];
    }),
    exitedGuests: asArray(root.exitedGuests).flatMap((item) => {
      const parsed = parseExitedGuest(item);

      return parsed ? [parsed] : [];
    }),
  };
}

export async function getManagerDashboardData(
  currentUser: CurrentUserContext,
): Promise<ManagerDashboardData> {
  noStore();

  const campIds = getManagerCampIds(currentUser);
  const admin =
    createSupabaseAdminClient() as unknown as ManagerDashboardRpcClient;

  const { data, error } = await admin.rpc("get_manager_dashboard_snapshot", {
    p_camp_ids: campIds,
    p_current_guest_limit: CURRENT_GUEST_LIMIT,
    p_exited_guest_limit: EXITED_GUEST_LIMIT,
    p_now_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to load manager dashboard: ${error.message}`);
  }

  return parseManagerDashboardData(data);
}

export async function getManagerCurrentGuests(
  limit = 100,
): Promise<ManagerCurrentGuestRow[]> {
  noStore();

  const safeLimit = Math.min(Math.max(limit, 1), 250);
  const supabase = getTypedClient(await createServerSupabaseClient());

  const { data, error } = await supabase
    .from("manager_current_guests_view")
    .select(CURRENT_GUEST_COLUMNS.join(","))
    .order("arrival_time", { ascending: false, nullsFirst: false })
    .limit(safeLimit)
    .returns<ManagerCurrentGuestRow[]>();

  return requireData(data, error, "current guests");
}

export async function getManagerExitedGuests(
  limit = 100,
): Promise<ManagerExitedGuestRow[]> {
  noStore();

  const safeLimit = Math.min(Math.max(limit, 1), 250);
  const supabase = getTypedClient(await createServerSupabaseClient());

  const { data, error } = await supabase
    .from("manager_exited_guests_view")
    .select(EXITED_GUEST_COLUMNS.join(","))
    .order("departure_or_exit_time", {
      ascending: false,
      nullsFirst: false,
    })
    .limit(safeLimit)
    .returns<ManagerExitedGuestRow[]>();

  return requireData(data, error, "exited guests");
}