// src/lib/queries/room-board/get-room-board.ts

import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RoomBoardStatus = Enums<"room_status">;
export type RoomBoardConditionStatus = Enums<"room_condition_status">;

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
  expected_departure_at: string | null;
};

export type RoomBoardSummary = {
  total: number;
  vacantReady: number;
  reserved: number;
  pendingCheckIn: number;
  occupied: number;
  pendingCheckout: number;
  blocked: number;
};

export type RoomBoardResult = {
  rooms: RoomBoardItem[];
  summary: RoomBoardSummary;
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
    expected_departure_at: row.expected_departure_at,
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

  const rooms = rows.filter(isValidRoomBoardRow).map(mapRoomBoardRow);

  return {
    rooms,
    summary: buildSummary(rooms),
  };
}