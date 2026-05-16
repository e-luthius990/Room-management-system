import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ReservationStatus = Enums<"reservation_status">;

export type ReservationListItem = {
  id: string;
  guest_id: string | null;
  group_id: string | null;
  guest_name: string | null;
  camp_id: string;
  camp_name: string;
  room_id: string;
  room_number: string;
  building_name: string;
  status: ReservationStatus;
  expected_arrival_at: string;
  expected_departure_at: string;
  is_vip_hold: boolean;
  created_at: string;
};

const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "cancelled",
  "no_show",
  "checked_in",
  "expired",
] satisfies ReservationStatus[];

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
  created_at: string;
};

type GuestRow = {
  id: string;
  full_name: string | null;
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

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

export async function getReservations(): Promise<ReservationListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data: reservations, error } = await supabase
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
        "created_at",
      ].join(","),
    )
    .in("status", [...RESERVATION_STATUSES])
    .order("expected_arrival_at", { ascending: true })
    .limit(300)
    .returns<ReservationRow[]>();

  if (error) {
    throw new Error(`Failed to load reservations: ${error.message}`);
  }

  const rows = reservations ?? [];

  if (rows.length === 0) {
    return [];
  }

  const guestIds = uniqueStrings(rows.map((reservation) => reservation.guest_id));
  const campIds = uniqueStrings(rows.map((reservation) => reservation.camp_id));
  const roomIds = uniqueStrings(rows.map((reservation) => reservation.room_id));

  const guestNamesById = new Map<string, string | null>();
  const campNamesById = new Map<string, string | null>();
  const roomById = new Map<
    string,
    {
      room_number: string | null;
      building_id: string | null;
    }
  >();
  const buildingNamesById = new Map<string, string | null>();

  if (guestIds.length > 0) {
    const { data: guests, error: guestsError } = await supabase
      .from("guests")
      .select("id,full_name")
      .in("id", guestIds)
      .returns<GuestRow[]>();

    if (guestsError) {
      throw new Error(`Failed to load reservation guests: ${guestsError.message}`);
    }

    for (const guest of guests ?? []) {
      guestNamesById.set(guest.id, guest.full_name);
    }
  }

  if (campIds.length > 0) {
    const { data: camps, error: campsError } = await supabase
      .from("camps")
      .select("id,name")
      .in("id", campIds)
      .returns<CampRow[]>();

    if (campsError) {
      throw new Error(`Failed to load reservation camps: ${campsError.message}`);
    }

    for (const camp of camps ?? []) {
      campNamesById.set(camp.id, camp.name);
    }
  }

  if (roomIds.length > 0) {
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id,room_number,building_id")
      .in("id", roomIds)
      .returns<RoomRow[]>();

    if (roomsError) {
      throw new Error(`Failed to load reservation rooms: ${roomsError.message}`);
    }

    const buildingIds = uniqueStrings(
      (rooms ?? []).map((room) => room.building_id),
    );

    for (const room of rooms ?? []) {
      roomById.set(room.id, {
        room_number: room.room_number,
        building_id: room.building_id,
      });
    }

    if (buildingIds.length > 0) {
      const { data: buildings, error: buildingsError } = await supabase
        .from("buildings")
        .select("id,name")
        .in("id", buildingIds)
        .returns<BuildingRow[]>();

      if (buildingsError) {
        throw new Error(
          `Failed to load reservation buildings: ${buildingsError.message}`,
        );
      }

      for (const building of buildings ?? []) {
        buildingNamesById.set(building.id, building.name);
      }
    }
  }

  return rows.map((reservation) => {
    const room = roomById.get(reservation.room_id);

    return {
      id: reservation.id,
      guest_id: reservation.guest_id,
      group_id: reservation.group_id,
      guest_name: reservation.guest_id
        ? (guestNamesById.get(reservation.guest_id) ?? null)
        : null,
      camp_id: reservation.camp_id,
      camp_name: campNamesById.get(reservation.camp_id) ?? "Unknown camp",
      room_id: reservation.room_id,
      room_number: room?.room_number ?? "Unknown room",
      building_name: room?.building_id
        ? (buildingNamesById.get(room.building_id) ?? "Unknown building")
        : "Unknown building",
      status: reservation.status,
      expected_arrival_at: reservation.expected_arrival_at,
      expected_departure_at: reservation.expected_departure_at,
      is_vip_hold: reservation.is_vip_hold,
      created_at: reservation.created_at,
    };
  });
}