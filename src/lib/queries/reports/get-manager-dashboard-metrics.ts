import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type RoomStatus = Enums<"room_status">;
type StayStatus = Enums<"stay_status">;
type ReservationStatus = Enums<"reservation_status">;
type HousekeepingTaskStatus = Enums<"housekeeping_task_status">;
type MaintenanceTicketStatus = Enums<"maintenance_ticket_status">;
type InspectionStatus = Enums<"inspection_status">;
type RoomServiceTaskStatus = Enums<"room_service_task_status">;

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

const ACTIVE_HOUSEKEEPING_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
] as const satisfies readonly HousekeepingTaskStatus[];

const OPEN_MAINTENANCE_STATUSES = [
  "reported",
  "assigned",
  "in_progress",
  "waiting_for_parts",
  "reopened",
] as const satisfies readonly MaintenanceTicketStatus[];

const ACTIONABLE_INSPECTION_STATUSES = [
  "pending",
  "failed",
] as const satisfies readonly InspectionStatus[];

const ACTIVE_ROOM_SERVICE_STATUSES = [
  "pending",
  "assigned",
  "in_progress",
] as const satisfies readonly RoomServiceTaskStatus[];

const CLEANING_ROOM_STATUSES = new Set<RoomStatus>([
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
]);

const MAINTENANCE_BLOCKED_ROOM_STATUSES = new Set<RoomStatus>([
  "under_maintenance",
  "out_of_service",
  "manager_hold",
]);

type DashboardRoomRow = {
  room_id: string | null;
  current_status: RoomStatus | null;
  open_maintenance_count: number | string | null;
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

  const [
    roomsResult,
    activeStaysResult,
    expectedArrivalsResult,
    housekeepingResult,
    maintenanceResult,
    inspectionsResult,
    roomServiceResult,
  ] = await Promise.all([
    supabase
      .from("room_board_view")
      .select("room_id,current_status,open_maintenance_count")
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

    supabase
      .from("housekeeping_tasks")
      .select("id", { count: "exact", head: true })
      .in("status", [...ACTIVE_HOUSEKEEPING_STATUSES]),

    supabase
      .from("maintenance_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", [...OPEN_MAINTENANCE_STATUSES]),

    supabase
      .from("inspections")
      .select("id", { count: "exact", head: true })
      .in("status", [...ACTIONABLE_INSPECTION_STATUSES]),

    supabase
      .from("room_service_tasks")
      .select("id", { count: "exact", head: true })
      .in("status", [...ACTIVE_ROOM_SERVICE_STATUSES]),
  ]);

  const firstError =
    roomsResult.error ??
    activeStaysResult.error ??
    expectedArrivalsResult.error ??
    housekeepingResult.error ??
    maintenanceResult.error ??
    inspectionsResult.error ??
    roomServiceResult.error;

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

    maintenanceBlockedRooms: roomRows.filter(
      (room) =>
        MAINTENANCE_BLOCKED_ROOM_STATUSES.has(room.current_status) ||
        toNumber(room.open_maintenance_count) > 0,
    ).length,

    activeStays: countValue(activeStaysResult.count),
    expectedArrivals: countValue(expectedArrivalsResult.count),
    pendingHousekeepingTasks: countValue(housekeepingResult.count),
    openMaintenanceTickets: countValue(maintenanceResult.count),
    pendingInspections: countValue(inspectionsResult.count),
    pendingRoomServiceTasks: countValue(roomServiceResult.count),
  };
}