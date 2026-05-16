import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type RoomBoardStatus = Enums<"room_status">;
export type RoomBoardConditionStatus = Enums<"room_condition_status">;
export type HousekeepingTaskStatus = Enums<"housekeeping_task_status">;

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
  last_cleaned_at: string | null;
  last_maintenance_at: string | null;
  last_inspected_at: string | null;
  current_stay_id: string | null;
  current_guest_id: string | null;
  current_guest_name: string | null;
  expected_departure_at: string | null;
  open_maintenance_count: number;
  active_housekeeping_status: HousekeepingTaskStatus | null;
};

export type RoomBoardSummary = {
  total: number;
  vacantReady: number;
  reserved: number;
  pendingCheckIn: number;
  occupied: number;
  pendingCheckout: number;
  needsCleaning: number;
  cleaningInProgress: number;
  inspectionNeeded: number;
  underMaintenance: number;
  outOfService: number;
  managerHold: number;
  maintenanceBlocked: number;
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
  capacity: number | null;
  current_status: RoomBoardStatus | null;
  condition_status: RoomBoardConditionStatus | null;
  is_vip: boolean | null;
  is_delegate_suitable: boolean | null;
  last_cleaned_at: string | null;
  last_maintenance_at: string | null;
  last_inspected_at: string | null;
  current_stay_id: string | null;
  current_guest_id: string | null;
  current_guest_name: string | null;
  expected_departure_at: string | null;
  open_maintenance_count: number | string | null;
  active_housekeeping_status: HousekeepingTaskStatus | null;
};

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

function buildSummary(rooms: RoomBoardItem[]): RoomBoardSummary {
  return {
    total: rooms.length,
    vacantReady: rooms.filter((room) => room.current_status === "vacant_ready")
      .length,
    reserved: rooms.filter((room) => room.current_status === "reserved").length,
    pendingCheckIn: rooms.filter(
      (room) => room.current_status === "pending_check_in",
    ).length,
    occupied: rooms.filter((room) => room.current_status === "occupied").length,
    pendingCheckout: rooms.filter(
      (room) => room.current_status === "pending_checkout",
    ).length,
    needsCleaning: rooms.filter(
      (room) => room.current_status === "needs_cleaning",
    ).length,
    cleaningInProgress: rooms.filter(
      (room) => room.current_status === "cleaning_in_progress",
    ).length,
    inspectionNeeded: rooms.filter(
      (room) => room.current_status === "inspection_needed",
    ).length,
    underMaintenance: rooms.filter(
      (room) => room.current_status === "under_maintenance",
    ).length,
    outOfService: rooms.filter(
      (room) => room.current_status === "out_of_service",
    ).length,
    managerHold: rooms.filter(
      (room) => room.current_status === "manager_hold",
    ).length,
    maintenanceBlocked: rooms.filter(
      (room) =>
        room.current_status === "under_maintenance" ||
        room.open_maintenance_count > 0,
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

export async function getRoomBoard(): Promise<RoomBoardResult> {
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
        "last_cleaned_at",
        "last_maintenance_at",
        "last_inspected_at",
        "current_stay_id",
        "current_guest_id",
        "current_guest_name",
        "expected_departure_at",
        "open_maintenance_count",
        "active_housekeeping_status",
      ].join(","),
    )
    .order("camp_name", { ascending: true })
    .order("building_name", { ascending: true })
    .order("room_number", { ascending: true })
    .returns<RoomBoardViewRow[]>();

  if (error) {
    throwQueryError("Failed to load room board", error);
  }

  const rooms: RoomBoardItem[] = (data ?? [])
    .filter(
      (
        row,
      ): row is RoomBoardViewRow & {
        room_id: string;
        room_number: string;
        camp_id: string;
        camp_name: string;
        building_id: string;
        building_name: string;
        room_type: string;
        current_status: RoomBoardStatus;
        condition_status: RoomBoardConditionStatus;
      } =>
        Boolean(
          row.room_id &&
            row.room_number &&
            row.camp_id &&
            row.camp_name &&
            row.building_id &&
            row.building_name &&
            row.room_type &&
            row.current_status &&
            row.condition_status,
        ),
    )
    .map((row) => ({
      room_id: row.room_id,
      room_number: row.room_number,
      camp_id: row.camp_id,
      camp_name: row.camp_name,
      building_id: row.building_id,
      building_name: row.building_name,
      room_type: row.room_type,
      capacity: row.capacity ?? 0,
      current_status: row.current_status,
      condition_status: row.condition_status,
      is_vip: row.is_vip ?? false,
      is_delegate_suitable: row.is_delegate_suitable ?? false,
      last_cleaned_at: row.last_cleaned_at,
      last_maintenance_at: row.last_maintenance_at,
      last_inspected_at: row.last_inspected_at,
      current_stay_id: row.current_stay_id,
      current_guest_id: row.current_guest_id,
      current_guest_name: row.current_guest_name,
      expected_departure_at: row.expected_departure_at,
      open_maintenance_count: toNumber(row.open_maintenance_count),
      active_housekeeping_status: row.active_housekeeping_status,
    }));

  return {
    rooms,
    summary: buildSummary(rooms),
  };
}