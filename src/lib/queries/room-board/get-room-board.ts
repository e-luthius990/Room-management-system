// src/lib/queries/room-board/get-room-board.ts

import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RoomBoardStatus = Enums<"room_status">;
export type RoomBoardConditionStatus = Enums<"room_condition_status">;
export type RoomBoardFieldAbsenceStatus = Enums<"field_absence_status">;
export type RoomOccupancyStatus = Enums<"stay_status">;
export type RoomOccupancyGuestCategory = Enums<"guest_category">;

export type RoomBoardItem = {
  room_id: string;
  room_number: string;
  camp_id: string;
  camp_name: string;
  building_id: string;
  building_name: string;
  room_type: string;
  capacity: number;
  current_status: RoomBoardStatus;
  condition_status: RoomBoardConditionStatus;
  is_vip: boolean;
  is_delegate_suitable: boolean;
  current_stay_id: string | null;
  current_guest_id: string | null;
  current_guest_name: string | null;
  current_guest_profile_photo_path: string | null;
  current_guest_profile_photo_updated_at: string | null;
  expected_departure_at: string | null;

  active_field_absence_id: string | null;
  field_absence_status: RoomBoardFieldAbsenceStatus | null;
  field_absence_departure_at: string | null;
  field_absence_expected_return_at: string | null;
  field_absence_actual_return_at: string | null;
  field_absence_destination: string | null;
  field_absence_reason: string | null;
  field_absence_days_away: number;
  field_absence_days_until_return: number;
  field_absence_is_overdue: boolean;
  is_field_absent: boolean;
};

export type RoomBoardSummary = {
  total: number;
  vacantReady: number;
  reserved: number;
  pendingCheckIn: number;
  occupied: number;
  pendingCheckout: number;
  blocked: number;
  fieldAbsent: number;
  fieldAbsenceOverdue: number;
};

export type RoomBoardResult = {
  rooms: RoomBoardItem[];
  summary: RoomBoardSummary;
};

export type RoomOccupancyHistoryItem = {
  stay_id: string;
  guest_id: string;
  guest_name: string;
  guest_organization: string | null;
  guest_category: RoomOccupancyGuestCategory | null;
  guest_is_vip: boolean;
  guest_profile_photo_path: string | null;
  guest_profile_photo_updated_at: string | null;
  status: RoomOccupancyStatus;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  updated_at: string;
};

type RoomBoardViewRow = {
  room_id: string | null;
  room_number: string | null;
  camp_id: string | null;
  camp_name: string | null;
  building_id: string | null;
  building_name: string | null;
  room_type: string | null;
  capacity: number | string | null;
  current_status: RoomBoardStatus | null;
  condition_status: RoomBoardConditionStatus | null;
  is_vip: boolean | null;
  is_delegate_suitable: boolean | null;
  current_stay_id: string | null;
  current_guest_id: string | null;
  current_guest_name: string | null;
  expected_departure_at: string | null;

  active_field_absence_id: string | null;
  field_absence_status: RoomBoardFieldAbsenceStatus | null;
  field_absence_departure_at: string | null;
  field_absence_expected_return_at: string | null;
  field_absence_actual_return_at: string | null;
  field_absence_destination: string | null;
  field_absence_reason: string | null;
  field_absence_days_away: number | string | null;
  field_absence_days_until_return: number | string | null;
  field_absence_is_overdue: boolean | null;
  is_field_absent: boolean | null;
};

type RoomOccupancyStayRow = {
  id: string;
  guest_id: string;
  status: RoomOccupancyStatus;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  updated_at: string;
};

type RoomOccupancyGuestRow = {
  id: string;
  full_name: string | null;
  organization: string | null;
  guest_category: RoomOccupancyGuestCategory | null;
  is_vip: boolean | null;
  profile_photo_path: string | null;
  profile_photo_updated_at: string | null;
};

type RoomBoardGuestPhotoRow = {
  id: string;
  profile_photo_path: string | null;
  profile_photo_updated_at: string | null;
};

type ValidRoomBoardViewRow = RoomBoardViewRow & {
  room_id: string;
  room_number: string;
  camp_id: string;
  camp_name: string;
  building_id: string;
  building_name: string;
  room_type: string;
  current_status: RoomBoardStatus;
  condition_status: RoomBoardConditionStatus;
};

const ROOM_BOARD_SELECT = [
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
  "current_stay_id",
  "current_guest_id",
  "current_guest_name",
  "expected_departure_at",
  "active_field_absence_id",
  "field_absence_status",
  "field_absence_departure_at",
  "field_absence_expected_return_at",
  "field_absence_actual_return_at",
  "field_absence_destination",
  "field_absence_reason",
  "field_absence_days_away",
  "field_absence_days_until_return",
  "field_absence_is_overdue",
  "is_field_absent",
].join(",");

const BLOCKED_STATUSES = new Set<RoomBoardStatus>([
  "manager_hold",
  "out_of_service",
]);

function toNumber(value: number | string | null): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function hasText(value: string | null): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function fallbackText(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized.length > 0 ? normalized : fallback;
}

function uniqueStrings(values: ReadonlyArray<string | null>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function countByStatus(
  rooms: readonly RoomBoardItem[],
  status: RoomBoardStatus,
): number {
  return rooms.filter((room) => room.current_status === status).length;
}

function isBlockedRoom(room: RoomBoardItem): boolean {
  return BLOCKED_STATUSES.has(room.current_status);
}

function buildSummary(rooms: readonly RoomBoardItem[]): RoomBoardSummary {
  return {
    total: rooms.length,
    vacantReady: countByStatus(rooms, "vacant_ready"),
    reserved: countByStatus(rooms, "reserved"),
    pendingCheckIn: countByStatus(rooms, "pending_check_in"),
    occupied: countByStatus(rooms, "occupied"),
    pendingCheckout: countByStatus(rooms, "pending_checkout"),
    blocked: rooms.filter(isBlockedRoom).length,
    fieldAbsent: rooms.filter((room) => room.is_field_absent).length,
    fieldAbsenceOverdue: rooms.filter(
      (room) => room.field_absence_is_overdue,
    ).length,
  };
}

function throwQueryError(context: string, error: unknown): never {
  if (typeof error === "object" && error !== null && "message" in error) {
    const postgrestError = error as {
      code?: string;
      message?: string;
      details?: string;
      hint?: string;
    };

    console.error(`${context} failed`, {
      code: postgrestError.code,
      message: postgrestError.message,
      details: postgrestError.details,
      hint: postgrestError.hint,
    });

    throw new Error(`${context}: ${postgrestError.message ?? "Unknown error"}`);
  }

  console.error(`${context} failed`, error);
  throw new Error(`${context}: Unknown error`);
}

function isValidRoomBoardRow(row: RoomBoardViewRow): row is ValidRoomBoardViewRow {
  return (
    hasText(row.room_id) &&
    hasText(row.room_number) &&
    hasText(row.camp_id) &&
    hasText(row.camp_name) &&
    hasText(row.building_id) &&
    hasText(row.building_name) &&
    hasText(row.room_type) &&
    row.current_status !== null &&
    row.condition_status !== null
  );
}

function mapRoomBoardRow(row: ValidRoomBoardViewRow): RoomBoardItem {
  return {
    room_id: row.room_id,
    room_number: row.room_number,
    camp_id: row.camp_id,
    camp_name: row.camp_name,
    building_id: row.building_id,
    building_name: row.building_name,
    room_type: row.room_type,
    capacity: toNumber(row.capacity),
    current_status: row.current_status,
    condition_status: row.condition_status,
    is_vip: row.is_vip ?? false,
    is_delegate_suitable: row.is_delegate_suitable ?? false,
    current_stay_id: row.current_stay_id,
    current_guest_id: row.current_guest_id,
    current_guest_name: row.current_guest_name,
    current_guest_profile_photo_path: null,
    current_guest_profile_photo_updated_at: null,
    expected_departure_at: row.expected_departure_at,

    active_field_absence_id: row.active_field_absence_id,
    field_absence_status: row.field_absence_status,
    field_absence_departure_at: row.field_absence_departure_at,
    field_absence_expected_return_at: row.field_absence_expected_return_at,
    field_absence_actual_return_at: row.field_absence_actual_return_at,
    field_absence_destination: row.field_absence_destination,
    field_absence_reason: row.field_absence_reason,
    field_absence_days_away: toNumber(row.field_absence_days_away),
    field_absence_days_until_return: toNumber(
      row.field_absence_days_until_return,
    ),
    field_absence_is_overdue: row.field_absence_is_overdue ?? false,
    is_field_absent: row.is_field_absent ?? false,
  };
}

function logDroppedRows(rows: readonly RoomBoardViewRow[]): void {
  const droppedRows = rows.filter((row) => !isValidRoomBoardRow(row));

  if (droppedRows.length === 0) {
    return;
  }

  console.warn("Room board query returned invalid rows", {
    droppedCount: droppedRows.length,
    totalCount: rows.length,
    sample: droppedRows.slice(0, 3).map((row) => ({
      room_id: row.room_id,
      room_number: row.room_number,
      camp_id: row.camp_id,
      building_id: row.building_id,
      current_status: row.current_status,
      condition_status: row.condition_status,
    })),
  });
}

async function attachCurrentGuestPhotos(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  rooms: RoomBoardItem[],
): Promise<RoomBoardItem[]> {
  const guestIds = uniqueStrings(rooms.map((room) => room.current_guest_id));

  if (guestIds.length === 0) {
    return rooms;
  }

  const { data, error } = await supabase
    .from("guests")
    .select("id,profile_photo_path,profile_photo_updated_at")
    .in("id", guestIds)
    .returns<RoomBoardGuestPhotoRow[]>();

  if (error) {
    throw new Error(`Failed to load room guest photos: ${error.message}`);
  }

  const photosByGuestId = new Map(
    (data ?? []).map((guest) => [guest.id, guest]),
  );

  return rooms.map((room) => {
    const photo = room.current_guest_id
      ? photosByGuestId.get(room.current_guest_id)
      : undefined;

    return {
      ...room,
      current_guest_profile_photo_path: photo?.profile_photo_path ?? null,
      current_guest_profile_photo_updated_at:
        photo?.profile_photo_updated_at ?? null,
    };
  });
}

export async function getRoomBoard(): Promise<RoomBoardResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("room_board_view")
    .select(ROOM_BOARD_SELECT)
    .order("camp_name", { ascending: true })
    .order("building_name", { ascending: true })
    .order("room_number", { ascending: true })
    .returns<RoomBoardViewRow[]>();

  if (error) {
    throwQueryError("Failed to load room board", error);
  }

  const rows = data ?? [];

  logDroppedRows(rows);

  const rooms = await attachCurrentGuestPhotos(
    supabase,
    rows.filter(isValidRoomBoardRow).map(mapRoomBoardRow),
  );

  return {
    rooms,
    summary: buildSummary(rooms),
  };
}

export async function getRoomBoardRoom(
  roomId: string,
): Promise<RoomBoardItem | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("room_board_view")
    .select(ROOM_BOARD_SELECT)
    .eq("room_id", roomId)
    .maybeSingle<RoomBoardViewRow>();

  if (error) {
    throw new Error(`Failed to load room detail: ${error.message}`);
  }

  if (!data || !isValidRoomBoardRow(data)) {
    return null;
  }

  const [room] = await attachCurrentGuestPhotos(supabase, [
    mapRoomBoardRow(data),
  ]);

  return room ?? null;
}

export async function getRoomOccupancyHistory(
  roomId: string,
): Promise<RoomOccupancyHistoryItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data: stays, error } = await supabase
    .from("stays")
    .select(
      [
        "id",
        "guest_id",
        "status",
        "expected_arrival_at",
        "expected_departure_at",
        "checked_in_at",
        "checked_out_at",
        "updated_at",
      ].join(","),
    )
    .eq("room_id", roomId)
    .order("checked_in_at", { ascending: false, nullsFirst: false })
    .order("expected_arrival_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .returns<RoomOccupancyStayRow[]>();

  if (error) {
    throw new Error(`Failed to load room stay history: ${error.message}`);
  }

  const rows = stays ?? [];

  if (rows.length === 0) {
    return [];
  }

  const guestIds = uniqueStrings(rows.map((stay) => stay.guest_id));
  const guestById = new Map<string, RoomOccupancyGuestRow>();

  if (guestIds.length > 0) {
    const { data: guests, error: guestsError } = await supabase
      .from("guests")
      .select(
        "id,full_name,organization,guest_category,is_vip,profile_photo_path,profile_photo_updated_at",
      )
      .in("id", guestIds)
      .returns<RoomOccupancyGuestRow[]>();

    if (guestsError) {
      throw new Error(
        `Failed to load room history guests: ${guestsError.message}`,
      );
    }

    for (const guest of guests ?? []) {
      guestById.set(guest.id, guest);
    }
  }

  return rows.map((stay) => {
    const guest = guestById.get(stay.guest_id);

    return {
      stay_id: stay.id,
      guest_id: stay.guest_id,
      guest_name: fallbackText(guest?.full_name, "Unknown guest"),
      guest_organization: guest?.organization ?? null,
      guest_category: guest?.guest_category ?? null,
      guest_is_vip: Boolean(guest?.is_vip),
      guest_profile_photo_path: guest?.profile_photo_path ?? null,
      guest_profile_photo_updated_at: guest?.profile_photo_updated_at ?? null,
      status: stay.status,
      expected_arrival_at: stay.expected_arrival_at,
      expected_departure_at: stay.expected_departure_at,
      checked_in_at: stay.checked_in_at,
      checked_out_at: stay.checked_out_at,
      updated_at: stay.updated_at,
    };
  });
}
