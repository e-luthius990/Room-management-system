import "server-only";

import { notFound } from "next/navigation";
import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ReservationStatus = Enums<"reservation_status">;
type GuestCategory = Enums<"guest_category">;

export type ReservationDetail = {
  id: string;
  guest_id: string | null;
  group_id: string | null;
  guest_name: string | null;
  guest_category: GuestCategory | null;
  camp_id: string;
  camp_name: string;
  room_id: string;
  room_number: string;
  building_name: string;
  status: ReservationStatus;
  expected_arrival_at: string;
  expected_departure_at: string;
  is_vip_hold: boolean;
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
};

type ReservationRow = {
  id: string;
  guest_id: string | null;
  group_id: string | null;
  camp_id: string;
  room_id: string;
  status: ReservationStatus;
  expected_arrival_at: string;
  expected_departure_at: string;
  is_vip_hold: boolean;
  notes: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
};

type GuestRow = {
  id: string;
  full_name: string | null;
  guest_category: GuestCategory | null;
};

type CampRow = {
  id: string;
  name: string | null;
};

type RoomRow = {
  id: string;
  room_number: string | null;
  building_id: string | null;
};

type BuildingRow = {
  id: string;
  name: string | null;
};

export async function getReservationDetail(
  reservationId: string,
): Promise<ReservationDetail> {
  const supabase = await createServerSupabaseClient();

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .select(
      [
        "id",
        "guest_id",
        "group_id",
        "camp_id",
        "room_id",
        "status",
        "expected_arrival_at",
        "expected_departure_at",
        "is_vip_hold",
        "notes",
        "cancellation_reason",
        "cancelled_at",
        "created_at",
      ].join(","),
    )
    .eq("id", reservationId)
    .returns<ReservationRow[]>()
    .maybeSingle();

  if (reservationError) {
    throw new Error(
      `Failed to load reservation: ${reservationError.message}`,
    );
  }

  if (!reservation) {
    notFound();
  }

  const [
    { data: camp, error: campError },
    { data: room, error: roomError },
  ] = await Promise.all([
    supabase
      .from("camps")
      .select("id,name")
      .eq("id", reservation.camp_id)
      .returns<CampRow[]>()
      .maybeSingle(),

    supabase
      .from("rooms")
      .select("id,room_number,building_id")
      .eq("id", reservation.room_id)
      .eq("camp_id", reservation.camp_id)
      .returns<RoomRow[]>()
      .maybeSingle(),
  ]);

  if (campError) {
    throw new Error(`Failed to load reservation camp: ${campError.message}`);
  }

  if (roomError) {
    throw new Error(`Failed to load reservation room: ${roomError.message}`);
  }

  let guestName: string | null = null;
  let guestCategory: GuestCategory | null = null;

  if (reservation.guest_id) {
    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .select("id,full_name,guest_category")
      .eq("id", reservation.guest_id)
      .returns<GuestRow[]>()
      .maybeSingle();

    if (guestError) {
      throw new Error(
        `Failed to load reservation guest: ${guestError.message}`,
      );
    }

    guestName = guest?.full_name ?? null;
    guestCategory = guest?.guest_category ?? null;
  }

  let buildingName = "Unknown building";

  if (room?.building_id) {
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("id,name")
      .eq("id", room.building_id)
      .eq("camp_id", reservation.camp_id)
      .returns<BuildingRow[]>()
      .maybeSingle();

    if (buildingError) {
      throw new Error(
        `Failed to load reservation building: ${buildingError.message}`,
      );
    }

    buildingName = building?.name ?? "Unknown building";
  }

  return {
    id: reservation.id,
    guest_id: reservation.guest_id,
    group_id: reservation.group_id,
    guest_name: guestName,
    guest_category: guestCategory,
    camp_id: reservation.camp_id,
    camp_name: camp?.name ?? "Unknown camp",
    room_id: reservation.room_id,
    room_number: room?.room_number ?? "Unknown room",
    building_name: buildingName,
    status: reservation.status,
    expected_arrival_at: reservation.expected_arrival_at,
    expected_departure_at: reservation.expected_departure_at,
    is_vip_hold: reservation.is_vip_hold,
    notes: reservation.notes,
    cancellation_reason: reservation.cancellation_reason,
    cancelled_at: reservation.cancelled_at,
    created_at: reservation.created_at,
  };
}