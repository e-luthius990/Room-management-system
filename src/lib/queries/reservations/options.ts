import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type GuestCategory = Enums<"guest_category">;
type RoomStatus = Enums<"room_status">;
type RoomConditionStatus = Enums<"room_condition_status">;

export type ReservationGuestOption = {
  id: string;
  full_name: string;
  guest_category: GuestCategory;
  primary_camp_id: string;
  primary_camp_name: string;
  organization_name: string | null;
  organization: string | null;
};

export type ReservationRoomOption = {
  room_id: string;
  room_number: string;
  camp_id: string;
  camp_name: string;
  building_name: string;
  room_type: string;
  capacity: number;
  current_status: RoomStatus;
  condition_status: RoomConditionStatus | null;
  is_vip: boolean;
  is_delegate_suitable: boolean;
};

const NON_RESERVABLE_ROOM_STATUSES: ReadonlySet<RoomStatus> = new Set([
  "needs_cleaning",
  "cleaning_in_progress",
  "inspection_needed",
  "under_maintenance",
  "out_of_service",
  "manager_hold",
]);

type GuestRow = {
  id: string;
  full_name: string | null;
  guest_category: GuestCategory | null;
  primary_camp_id: string | null;
  organization: string | null;
};

type CampRow = {
  id: string;
  name: string | null;
};

type ReservationRoomViewRow = {
  room_id: string | null;
  room_number: string | null;
  camp_id: string | null;
  camp_name: string | null;
  building_name: string | null;
  room_type: string | null;
  capacity: number | null;
  current_status: RoomStatus | null;
  condition_status: RoomConditionStatus | null;
  is_vip: boolean | null;
  is_delegate_suitable: boolean | null;
};

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

export async function getReservationGuestOptions(): Promise<
  ReservationGuestOption[]
> {
  const supabase = await createServerSupabaseClient();

  const { data: guests, error } = await supabase
    .from("guests")
    .select("id,full_name,guest_category,primary_camp_id,organization")
    .is("archived_at", null)
    .order("full_name", { ascending: true })
    .returns<GuestRow[]>();

  if (error) {
    throw new Error(`Failed to load guests: ${error.message}`);
  }

  const rows = guests ?? [];

  if (rows.length === 0) {
    return [];
  }

  const campIds = uniqueStrings(rows.map((guest) => guest.primary_camp_id));
  const campNamesById = new Map<string, string | null>();

  if (campIds.length > 0) {
    const { data: camps, error: campsError } = await supabase
      .from("camps")
      .select("id,name")
      .in("id", campIds)
      .returns<CampRow[]>();

    if (campsError) {
      throw new Error(`Failed to load guest camps: ${campsError.message}`);
    }

    for (const camp of camps ?? []) {
      campNamesById.set(camp.id, camp.name);
    }
  }

  return rows
    .filter(
      (
        guest,
      ): guest is GuestRow & {
        id: string;
        full_name: string;
        guest_category: GuestCategory;
        primary_camp_id: string;
      } =>
        Boolean(
          guest.id &&
            guest.full_name &&
            guest.guest_category &&
            guest.primary_camp_id,
        ),
    )
    .map((guest) => ({
      id: guest.id,
      full_name: guest.full_name,
      guest_category: guest.guest_category,
      primary_camp_id: guest.primary_camp_id,
      primary_camp_name:
        campNamesById.get(guest.primary_camp_id) ?? "Unknown camp",
      organization_name: guest.organization,
      organization: guest.organization,
    }));
}

export async function getReservationRoomOptions(): Promise<
  ReservationRoomOption[]
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("room_board_view")
    .select(
      [
        "room_id",
        "room_number",
        "camp_id",
        "camp_name",
        "building_name",
        "room_type",
        "capacity",
        "current_status",
        "condition_status",
        "is_vip",
        "is_delegate_suitable",
      ].join(","),
    )
    .order("camp_name", { ascending: true })
    .order("building_name", { ascending: true })
    .order("room_number", { ascending: true })
    .returns<ReservationRoomViewRow[]>();

  if (error) {
    throw new Error(`Failed to load rooms: ${error.message}`);
  }

  return (data ?? [])
    .filter(
      (
        room,
      ): room is ReservationRoomViewRow & {
        room_id: string;
        room_number: string;
        camp_id: string;
        camp_name: string;
        building_name: string;
        room_type: string;
        current_status: RoomStatus;
      } =>
        Boolean(
          room.room_id &&
            room.room_number &&
            room.camp_id &&
            room.camp_name &&
            room.building_name &&
            room.room_type &&
            room.current_status,
        ),
    )
    .filter((room) => !NON_RESERVABLE_ROOM_STATUSES.has(room.current_status))
    .map((room) => ({
      room_id: room.room_id,
      room_number: room.room_number,
      camp_id: room.camp_id,
      camp_name: room.camp_name,
      building_name: room.building_name,
      room_type: room.room_type,
      capacity: room.capacity ?? 0,
      current_status: room.current_status,
      condition_status: room.condition_status,
      is_vip: room.is_vip ?? false,
      is_delegate_suitable: room.is_delegate_suitable ?? false,
    }));
}