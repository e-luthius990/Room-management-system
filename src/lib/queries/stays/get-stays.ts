// src/lib/queries/stays/get-stays.ts

import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type StayStatus = Enums<"stay_status">;
type GuestCategory = Enums<"guest_category">;
type RoomStatus = Enums<"room_status">;

export type StayListView =
  | "current"
  | "reserved"
  | "active"
  | "check-outs"
  | "completed"
  | "all";

export type StayListItem = {
  id: string;

  guest_id: string;
  guest_name: string;
  guest_organization: string | null;
  guest_category: GuestCategory | null;
  guest_is_vip: boolean;

  reservation_id: string | null;

  room_id: string;
  room_number: string;
  room_status: RoomStatus | null;
  room_type_name: string | null;
  bed_type: string | null;

  building_id: string | null;
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

  can_check_in: boolean;
  can_check_out: boolean;
  is_active: boolean;
  is_completed: boolean;
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
};

type GuestRow = {
  id: string;
  full_name: string | null;
  organization: string | null;
  guest_category: GuestCategory | null;
  is_vip: boolean | null;
};

type CampRow = {
  id: string;
  name: string | null;
  code: string | null;
};

type RoomRow = {
  id: string;
  room_number: string | null;
  building_id: string | null;
  room_type_id: string | null;
  bed_type: string | null;
  current_status: RoomStatus | null;
};

type BuildingRow = {
  id: string;
  name: string | null;
  code: string | null;
};

type RoomTypeRow = {
  id: string;
  name: string | null;
  key: string | null;
};

const CURRENT_STAY_STATUSES = [
  "reserved",
  "checked_in",
  "occupied",
] as const satisfies readonly StayStatus[];

const ACTIVE_STAY_STATUSES = [
  "checked_in",
  "occupied",
] as const satisfies readonly StayStatus[];

const ALL_STAY_STATUSES = [
  "reserved",
  "checked_in",
  "occupied",
  "completed",
  "cancelled",
  "no_show",
  "transferred",
] as const satisfies readonly StayStatus[];

function uniqueStrings(values: ReadonlyArray<string | null>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function fallbackText(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = typeof value === "string" ? value.trim() : "";

  return normalized.length > 0 ? normalized : fallback;
}

function isActiveStayStatus(status: StayStatus): boolean {
  return status === "checked_in" || status === "occupied";
}

function getStatusesForView(view: StayListView): readonly StayStatus[] {
  switch (view) {
    case "reserved":
      return ["reserved"];

    case "active":
    case "check-outs":
      return ACTIVE_STAY_STATUSES;

    case "completed":
      return ["completed"];

    case "all":
      return ALL_STAY_STATUSES;

    case "current":
    default:
      return CURRENT_STAY_STATUSES;
  }
}

export function normalizeStayListView(value: string | undefined): StayListView {
  if (
    value === "current" ||
    value === "reserved" ||
    value === "active" ||
    value === "check-outs" ||
    value === "completed" ||
    value === "all"
  ) {
    return value;
  }

  return "current";
}

export function formatStayLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatStayDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export async function getStays(
  view: StayListView = "current",
): Promise<StayListItem[]> {
  const supabase = await createServerSupabaseClient();
  const statuses = getStatusesForView(view);

  let query = supabase
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
      ].join(","),
    )
    .in("status", [...statuses]);

  if (view === "check-outs" || view === "active") {
    query = query.order("expected_departure_at", {
      ascending: true,
      nullsFirst: false,
    });
  } else if (view === "completed") {
    query = query.order("checked_out_at", {
      ascending: false,
      nullsFirst: false,
    });
  } else if (view === "reserved") {
    query = query.order("expected_arrival_at", {
      ascending: true,
      nullsFirst: false,
    });
  } else {
    query = query.order("expected_arrival_at", {
      ascending: false,
      nullsFirst: false,
    });
  }

  const { data: stays, error } = await query.returns<StayRow[]>();

  if (error) {
    throw new Error(`Failed to load stays: ${error.message}`);
  }

  const rows = stays ?? [];

  if (rows.length === 0) {
    return [];
  }

  const guestIds = uniqueStrings(rows.map((stay) => stay.guest_id));
  const campIds = uniqueStrings(rows.map((stay) => stay.camp_id));
  const roomIds = uniqueStrings(rows.map((stay) => stay.room_id));

  const guestById = new Map<string, GuestRow>();
  const campById = new Map<string, CampRow>();
  const roomById = new Map<string, RoomRow>();
  const buildingById = new Map<string, BuildingRow>();
  const roomTypeById = new Map<string, RoomTypeRow>();

  if (guestIds.length > 0) {
    const { data: guests, error: guestsError } = await supabase
      .from("guests")
      .select("id,full_name,organization,guest_category,is_vip")
      .in("id", guestIds)
      .returns<GuestRow[]>();

    if (guestsError) {
      throw new Error(`Failed to load stay guests: ${guestsError.message}`);
    }

    for (const guest of guests ?? []) {
      guestById.set(guest.id, guest);
    }
  }

  if (campIds.length > 0) {
    const { data: camps, error: campsError } = await supabase
      .from("camps")
      .select("id,name,code")
      .in("id", campIds)
      .returns<CampRow[]>();

    if (campsError) {
      throw new Error(`Failed to load stay camps: ${campsError.message}`);
    }

    for (const camp of camps ?? []) {
      campById.set(camp.id, camp);
    }
  }

  if (roomIds.length > 0) {
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select(
        "id,room_number,building_id,room_type_id,bed_type,current_status",
      )
      .in("id", roomIds)
      .returns<RoomRow[]>();

    if (roomsError) {
      throw new Error(`Failed to load stay rooms: ${roomsError.message}`);
    }

    for (const room of rooms ?? []) {
      roomById.set(room.id, room);
    }

    const buildingIds = uniqueStrings(
      (rooms ?? []).map((room) => room.building_id),
    );

    const roomTypeIds = uniqueStrings(
      (rooms ?? []).map((room) => room.room_type_id),
    );

    if (buildingIds.length > 0) {
      const { data: buildings, error: buildingsError } = await supabase
        .from("buildings")
        .select("id,name,code")
        .in("id", buildingIds)
        .returns<BuildingRow[]>();

      if (buildingsError) {
        throw new Error(
          `Failed to load stay buildings: ${buildingsError.message}`,
        );
      }

      for (const building of buildings ?? []) {
        buildingById.set(building.id, building);
      }
    }

    if (roomTypeIds.length > 0) {
      const { data: roomTypes, error: roomTypesError } = await supabase
        .from("room_types")
        .select("id,name,key")
        .in("id", roomTypeIds)
        .returns<RoomTypeRow[]>();

      if (roomTypesError) {
        throw new Error(
          `Failed to load stay room types: ${roomTypesError.message}`,
        );
      }

      for (const roomType of roomTypes ?? []) {
        roomTypeById.set(roomType.id, roomType);
      }
    }
  }

  return rows.map((stay) => {
    const guest = guestById.get(stay.guest_id);
    const camp = campById.get(stay.camp_id);
    const room = roomById.get(stay.room_id);
    const building = room?.building_id
      ? buildingById.get(room.building_id)
      : undefined;
    const roomType = room?.room_type_id
      ? roomTypeById.get(room.room_type_id)
      : undefined;

    const isActive = isActiveStayStatus(stay.status);
    const isCompleted = stay.status === "completed";
    const canCheckIn = stay.status === "reserved";
    const canCheckOut = isActive;

    return {
      id: stay.id,

      guest_id: stay.guest_id,
      guest_name: fallbackText(guest?.full_name, "Unknown guest"),
      guest_organization: guest?.organization ?? null,
      guest_category: guest?.guest_category ?? null,
      guest_is_vip: Boolean(guest?.is_vip),

      reservation_id: stay.reservation_id,

      room_id: stay.room_id,
      room_number: fallbackText(room?.room_number, "Unknown room"),
      room_status: room?.current_status ?? null,
      room_type_name: roomType?.name ?? roomType?.key ?? null,
      bed_type: room?.bed_type ?? null,

      building_id: room?.building_id ?? null,
      building_name: fallbackText(building?.name, "Unknown building"),
      building_code: building?.code ?? null,

      camp_id: stay.camp_id,
      camp_name: fallbackText(camp?.name, "Unknown camp"),
      camp_code: camp?.code ?? null,

      status: stay.status,
      expected_arrival_at: stay.expected_arrival_at,
      expected_departure_at: stay.expected_departure_at,
      checked_in_at: stay.checked_in_at,
      checked_out_at: stay.checked_out_at,

      can_check_in: canCheckIn,
      can_check_out: canCheckOut,
      is_active: isActive,
      is_completed: isCompleted,
    };
  });
}