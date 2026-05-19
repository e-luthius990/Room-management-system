import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type CampStatus = Enums<"camp_status">;
type BuildingStatus = Enums<"building_status">;
type RoomStatus = Enums<"room_status">;
type RoomConditionStatus = Enums<"room_condition_status">;

export type CampListItem = {
  id: string;
  name: string;
  code: string;
  location: string | null;
  status: CampStatus;
  created_at: string;
};

export type BuildingListItem = {
  id: string;
  camp_id: string;
  name: string;
  code: string;
  floor_count: number | null;
  status: BuildingStatus;
  camp_name: string;
};

export type RoomTypeListItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  default_capacity: number | null;
  is_active: boolean;
};

export type AmenityListItem = {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
};

export type RoomInventoryItem = {
  room_id: string;
  room_number: string;
  camp_id: string;
  camp_name: string;
  building_id: string;
  building_name: string;
  room_type: string;
  capacity: number;
  current_status: RoomStatus;
  condition_status: RoomConditionStatus;
  is_vip: boolean;
  is_delegate_suitable: boolean;
};

type CampRow = {
  id: string;
  name: string | null;
  code: string | null;
  location: string | null;
  status: CampStatus;
  created_at: string | null;
};

type BuildingRow = {
  id: string;
  camp_id: string;
  name: string | null;
  code: string | null;
  floor_count: number | null;
  status: BuildingStatus;
};

type CampNameRow = {
  id: string;
  name: string | null;
};

type RoomTypeRow = {
  id: string;
  key: string | null;
  name: string | null;
  description: string | null;
  default_capacity: number | null;
  is_active: boolean | null;
};

type AmenityRow = {
  id: string;
  key: string | null;
  name: string | null;
  is_active: boolean | null;
};

type RoomBoardRow = {
  room_id: string | null;
  room_number: string | null;
  camp_id: string | null;
  camp_name: string | null;
  building_id: string | null;
  building_name: string | null;
  room_type: string | null;
  capacity: number | string | null;
  current_status: RoomStatus | null;
  condition_status: RoomConditionStatus | null;
  is_vip: boolean | null;
  is_delegate_suitable: boolean | null;
};

function uniqueStrings(values: ReadonlyArray<string | null>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
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

function toRequiredText(value: string | null, fallback: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

export async function getCamps(): Promise<CampListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("camps")
    .select("id,name,code,location,status,created_at")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .returns<CampRow[]>();

  if (error) {
    throw new Error(`Failed to load camps: ${error.message}`);
  }

  return (data ?? []).map((camp) => ({
    id: camp.id,
    name: toRequiredText(camp.name, "Unnamed camp"),
    code: toRequiredText(camp.code, "UNKNOWN"),
    location: camp.location,
    status: camp.status,
    created_at: camp.created_at ?? new Date(0).toISOString(),
  }));
}

export async function getBuildings(): Promise<BuildingListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data: buildings, error } = await supabase
    .from("buildings")
    .select("id,camp_id,name,code,floor_count,status")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .returns<BuildingRow[]>();

  if (error) {
    throw new Error(`Failed to load buildings: ${error.message}`);
  }

  const rows = buildings ?? [];

  if (rows.length === 0) {
    return [];
  }

  const campIds = uniqueStrings(rows.map((building) => building.camp_id));
  const campNamesById = new Map<string, string>();

  if (campIds.length > 0) {
    const { data: camps, error: campsError } = await supabase
      .from("camps")
      .select("id,name")
      .in("id", campIds)
      .returns<CampNameRow[]>();

    if (campsError) {
      throw new Error(`Failed to load building camps: ${campsError.message}`);
    }

    for (const camp of camps ?? []) {
      campNamesById.set(camp.id, toRequiredText(camp.name, "Unknown camp"));
    }
  }

  return rows.map((building) => ({
    id: building.id,
    camp_id: building.camp_id,
    name: toRequiredText(building.name, "Unnamed building"),
    code: toRequiredText(building.code, "UNKNOWN"),
    floor_count: building.floor_count,
    status: building.status,
    camp_name: campNamesById.get(building.camp_id) ?? "Unknown camp",
  }));
}

export async function getRoomTypes(): Promise<RoomTypeListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("room_types")
    .select("id,key,name,description,default_capacity,is_active")
    .order("name", { ascending: true })
    .returns<RoomTypeRow[]>();

  if (error) {
    throw new Error(`Failed to load room types: ${error.message}`);
  }

  return (data ?? []).map((roomType) => ({
    id: roomType.id,
    key: toRequiredText(roomType.key, "unknown"),
    name: toRequiredText(roomType.name, "Unnamed room type"),
    description: roomType.description,
    default_capacity: roomType.default_capacity,
    is_active: roomType.is_active ?? true,
  }));
}

export async function getAmenities(): Promise<AmenityListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("amenities")
    .select("id,key,name,is_active")
    .order("name", { ascending: true })
    .returns<AmenityRow[]>();

  if (error) {
    throw new Error(`Failed to load amenities: ${error.message}`);
  }

  return (data ?? []).map((amenity) => ({
    id: amenity.id,
    key: toRequiredText(amenity.key, "unknown"),
    name: toRequiredText(amenity.name, "Unnamed amenity"),
    is_active: amenity.is_active ?? true,
  }));
}

export async function getRoomInventory(): Promise<RoomInventoryItem[]> {
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
      ].join(","),
    )
    .order("camp_name", { ascending: true })
    .order("building_name", { ascending: true })
    .order("room_number", { ascending: true })
    .returns<RoomBoardRow[]>();

  if (error) {
    throw new Error(`Failed to load room inventory: ${error.message}`);
  }

  return (data ?? [])
    .filter(
      (room): room is RoomBoardRow & {
        room_id: string;
        room_number: string;
        camp_id: string;
        building_id: string;
        current_status: RoomStatus;
        condition_status: RoomConditionStatus;
      } =>
        Boolean(
          room.room_id &&
            room.room_number &&
            room.camp_id &&
            room.building_id &&
            room.current_status &&
            room.condition_status,
        ),
    )
    .map((room) => ({
      room_id: room.room_id,
      room_number: room.room_number,
      camp_id: room.camp_id,
      camp_name: toRequiredText(room.camp_name, "Unknown camp"),
      building_id: room.building_id,
      building_name: toRequiredText(room.building_name, "Unknown building"),
      room_type: toRequiredText(room.room_type, "Unknown room type"),
      capacity: toNumber(room.capacity),
      current_status: room.current_status,
      condition_status: room.condition_status,
      is_vip: room.is_vip ?? false,
      is_delegate_suitable: room.is_delegate_suitable ?? false,
    }));
}