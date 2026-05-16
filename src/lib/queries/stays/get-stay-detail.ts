import "server-only";

import { notFound } from "next/navigation";
import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type StayStatus = Enums<"stay_status">;
type GuestCategory = Enums<"guest_category">;
type AllocationStatus = Enums<"allocation_status">;
type RoomStatus = Enums<"room_status">;

export type StayDetail = {
  id: string;
  guest_id: string;
  guest_name: string;
  guest_category: GuestCategory | null;
  guest_organization: string | null;
  guest_is_vip: boolean;

  reservation_id: string | null;

  room_id: string;
  room_number: string;
  room_status: RoomStatus | null;
  room_type_name: string | null;
  bed_type: string | null;

  building_name: string;
  building_code: string | null;

  camp_id: string;
  camp_name: string;
  camp_code: string | null;

  status: StayStatus;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  checkin_notes: string | null;
  checkout_notes: string | null;

  allocation_id: string | null;
  allocation_status: AllocationStatus | null;
  allocation_notes: string | null;
  allocated_at: string | null;

  can_check_in: boolean;
  can_check_out: boolean;
  is_active: boolean;
  is_completed: boolean;
};

export type StayDetailResult = {
  stay: StayDetail;
};

type StayRow = {
  id: string;
  guest_id: string;
  reservation_id: string | null;
  room_id: string;
  camp_id: string;
  status: StayStatus;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  checkin_notes: string | null;
  checkout_notes: string | null;
};

type GuestRow = {
  full_name: string | null;
  organization: string | null;
  guest_category: GuestCategory | null;
  is_vip: boolean | null;
};

type CampRow = {
  name: string | null;
  code: string | null;
};

type RoomRow = {
  room_number: string | null;
  building_id: string | null;
  room_type_id: string | null;
  bed_type: string | null;
  current_status: RoomStatus | null;
};

type BuildingRow = {
  name: string | null;
  code: string | null;
};

type RoomTypeRow = {
  name: string | null;
  key: string | null;
};

type AllocationRow = {
  id: string;
  status: AllocationStatus;
  allocation_notes: string | null;
  allocated_at: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function fallbackText(value: string | null | undefined, fallback: string): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized.length > 0 ? normalized : fallback;
}

function isActiveStayStatus(status: StayStatus): boolean {
  return status === "checked_in" || status === "occupied";
}

export async function getStayDetail(stayId: string): Promise<StayDetailResult> {
  if (!isUuid(stayId)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();

  const { data: stay, error: stayError } = await supabase
    .from("stays")
    .select(
      [
        "id",
        "guest_id",
        "reservation_id",
        "room_id",
        "camp_id",
        "status",
        "expected_arrival_at",
        "expected_departure_at",
        "checked_in_at",
        "checked_out_at",
        "checkin_notes",
        "checkout_notes",
      ].join(","),
    )
    .eq("id", stayId)
    .returns<StayRow[]>()
    .maybeSingle();

  if (stayError) {
    throw new Error(`Failed to load stay: ${stayError.message}`);
  }

  if (!stay) {
    notFound();
  }

  const [guestResult, campResult, roomResult, allocationResult] =
    await Promise.all([
      supabase
        .from("guests")
        .select("full_name,organization,guest_category,is_vip")
        .eq("id", stay.guest_id)
        .returns<GuestRow[]>()
        .maybeSingle(),

      supabase
        .from("camps")
        .select("name,code")
        .eq("id", stay.camp_id)
        .returns<CampRow[]>()
        .maybeSingle(),

      supabase
        .from("rooms")
        .select("room_number,building_id,room_type_id,bed_type,current_status")
        .eq("id", stay.room_id)
        .eq("camp_id", stay.camp_id)
        .returns<RoomRow[]>()
        .maybeSingle(),

      supabase
        .from("room_allocations")
        .select("id,status,allocation_notes,allocated_at")
        .eq("stay_id", stay.id)
        .order("allocated_at", { ascending: false })
        .limit(1)
        .returns<AllocationRow[]>()
        .maybeSingle(),
    ]);

  if (guestResult.error) {
    throw new Error(`Failed to load stay guest: ${guestResult.error.message}`);
  }

  if (campResult.error) {
    throw new Error(`Failed to load stay camp: ${campResult.error.message}`);
  }

  if (roomResult.error) {
    throw new Error(`Failed to load stay room: ${roomResult.error.message}`);
  }

  if (allocationResult.error) {
    throw new Error(
      `Failed to load stay allocation: ${allocationResult.error.message}`,
    );
  }

  let buildingName = "Unknown building";
  let buildingCode: string | null = null;
  let roomTypeName: string | null = null;

  if (roomResult.data?.building_id) {
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("name,code")
      .eq("id", roomResult.data.building_id)
      .eq("camp_id", stay.camp_id)
      .returns<BuildingRow[]>()
      .maybeSingle();

    if (buildingError) {
      throw new Error(`Failed to load stay building: ${buildingError.message}`);
    }

    buildingName = fallbackText(building?.name, "Unknown building");
    buildingCode = building?.code ?? null;
  }

  if (roomResult.data?.room_type_id) {
    const { data: roomType, error: roomTypeError } = await supabase
      .from("room_types")
      .select("name,key")
      .eq("id", roomResult.data.room_type_id)
      .returns<RoomTypeRow[]>()
      .maybeSingle();

    if (roomTypeError) {
      throw new Error(`Failed to load stay room type: ${roomTypeError.message}`);
    }

    roomTypeName = roomType?.name ?? roomType?.key ?? null;
  }

  const isActive = isActiveStayStatus(stay.status);
  const isCompleted = stay.status === "completed";
  const canCheckIn = stay.status === "reserved";
  const canCheckOut = isActive;

  return {
    stay: {
      id: stay.id,
      guest_id: stay.guest_id,
      guest_name: fallbackText(guestResult.data?.full_name, "Unknown guest"),
      guest_category: guestResult.data?.guest_category ?? null,
      guest_organization: guestResult.data?.organization ?? null,
      guest_is_vip: Boolean(guestResult.data?.is_vip),

      reservation_id: stay.reservation_id,

      room_id: stay.room_id,
      room_number: fallbackText(roomResult.data?.room_number, "Unknown room"),
      room_status: roomResult.data?.current_status ?? null,
      room_type_name: roomTypeName,
      bed_type: roomResult.data?.bed_type ?? null,

      building_name: buildingName,
      building_code: buildingCode,

      camp_id: stay.camp_id,
      camp_name: fallbackText(campResult.data?.name, "Unknown camp"),
      camp_code: campResult.data?.code ?? null,

      status: stay.status,
      expected_arrival_at: stay.expected_arrival_at,
      expected_departure_at: stay.expected_departure_at,
      checked_in_at: stay.checked_in_at,
      checked_out_at: stay.checked_out_at,
      checkin_notes: stay.checkin_notes,
      checkout_notes: stay.checkout_notes,

      allocation_id: allocationResult.data?.id ?? null,
      allocation_status: allocationResult.data?.status ?? null,
      allocation_notes: allocationResult.data?.allocation_notes ?? null,
      allocated_at: allocationResult.data?.allocated_at ?? null,

      can_check_in: canCheckIn,
      can_check_out: canCheckOut,
      is_active: isActive,
      is_completed: isCompleted,
    },
  };
}