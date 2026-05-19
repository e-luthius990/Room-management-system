import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RoomStatus = Enums<"room_status">;
type StayStatus = Enums<"stay_status">;
type ReservationStatus = Enums<"reservation_status">;

export type ManagerDashboardMetrics = {
  totalRooms: number;
  vacantReadyRooms: number;
  occupiedRooms: number;
  cleaningRooms: number;
  maintenanceBlockedRooms: number;
  activeStays: number;
  expectedArrivals: number;
  pendingHousekeepingTasks: number;
  openMaintenanceTickets: number;
  pendingInspections: number;
  pendingRoomServiceTasks: number;
};

const ACTIVE_STAY_STATUSES = [
  "checked_in",
  "occupied",
] as const satisfies readonly StayStatus[];

const EXPECTED_ARRIVAL_STATUSES = [
  "pending",
  "confirmed",
] as const satisfies readonly ReservationStatus[];

const CLEANING_ROOM_STATUSES = new Set<RoomStatus>([
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
]);

const UNAVAILABLE_ROOM_STATUSES = new Set<RoomStatus>([
  "under_maintenance",
  "out_of_service",
  "manager_hold",
]);

type DashboardRoomRow = {
  room_id: string | null;
  current_status: RoomStatus | null;
};

function getEatDateParts(): {
  year: string;
  month: string;
  day: string;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
}

function todayWindowEat(): { start: string; end: string } {
  const { year, month, day } = getEatDateParts();
  const date = `${year}-${month}-${day}`;

  return {
    start: `${date}T00:00:00+03:00`,
    end: `${date}T23:59:59+03:00`,
  };
}

function countValue(value: number | null): number {
  return value ?? 0;
}

function isDashboardRoomRow(
  row: DashboardRoomRow,
): row is DashboardRoomRow & {
  room_id: string;
  current_status: RoomStatus;
} {
  return Boolean(row.room_id && row.current_status);
}

export async function getManagerDashboardMetrics(): Promise<ManagerDashboardMetrics> {
  const supabase = await createServerSupabaseClient();
  const { start, end } = todayWindowEat();

  const [roomsResult, activeStaysResult, expectedArrivalsResult] =
    await Promise.all([
      supabase
        .from("room_board_view")
        .select("room_id,current_status")
        .returns<DashboardRoomRow[]>(),

      supabase
        .from("stays")
        .select("id", { count: "exact", head: true })
        .in("status", [...ACTIVE_STAY_STATUSES]),

      supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .in("status", [...EXPECTED_ARRIVAL_STATUSES])
        .gte("expected_arrival_at", start)
        .lte("expected_arrival_at", end),
    ]);

  const firstError =
    roomsResult.error ??
    activeStaysResult.error ??
    expectedArrivalsResult.error;

  if (firstError) {
    throw new Error(`Failed to load dashboard metrics: ${firstError.message}`);
  }

  const roomRows = (roomsResult.data ?? []).filter(isDashboardRoomRow);

  return {
    totalRooms: roomRows.length,

    vacantReadyRooms: roomRows.filter(
      (room) => room.current_status === "vacant_ready",
    ).length,

    occupiedRooms: roomRows.filter(
      (room) => room.current_status === "occupied",
    ).length,

    cleaningRooms: roomRows.filter((room) =>
      CLEANING_ROOM_STATUSES.has(room.current_status),
    ).length,

    maintenanceBlockedRooms: roomRows.filter((room) =>
      UNAVAILABLE_ROOM_STATUSES.has(room.current_status),
    ).length,

    activeStays: countValue(activeStaysResult.count),
    expectedArrivals: countValue(expectedArrivalsResult.count),

    pendingHousekeepingTasks: 0,
    openMaintenanceTickets: 0,
    pendingInspections: 0,
    pendingRoomServiceTasks: 0,
  };
}