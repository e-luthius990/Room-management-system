import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type CampOption = {
  id: string;
  name: string;
  code: string;
};

export type BuildingOption = {
  id: string;
  camp_id: string;
  name: string;
  code: string;
};

export type RoomTypeOption = {
  id: string;
  name: string;
  key: string;
  default_capacity: number | null;
};

export type AmenityOption = {
  id: string;
  name: string;
  key: string;
};

type CampOptionRow = {
  id: string;
  name: string | null;
  code: string | null;
};

type BuildingOptionRow = {
  id: string;
  camp_id: string;
  name: string | null;
  code: string | null;
};

type RoomTypeOptionRow = {
  id: string;
  name: string | null;
  key: string | null;
  default_capacity: number | null;
};

type AmenityOptionRow = {
  id: string;
  name: string | null;
  key: string | null;
};

function toRequiredText(value: string | null, fallback: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

export async function getCampOptions(): Promise<CampOption[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("camps")
    .select("id,name,code")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .returns<CampOptionRow[]>();

  if (error) {
    throw new Error(`Failed to load camps: ${error.message}`);
  }

  return (data ?? []).map((camp) => ({
    id: camp.id,
    name: toRequiredText(camp.name, "Unnamed camp"),
    code: toRequiredText(camp.code, "UNKNOWN"),
  }));
}

export async function getBuildingOptions(): Promise<BuildingOption[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("buildings")
    .select("id,camp_id,name,code")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .returns<BuildingOptionRow[]>();

  if (error) {
    throw new Error(`Failed to load buildings: ${error.message}`);
  }

  return (data ?? []).map((building) => ({
    id: building.id,
    camp_id: building.camp_id,
    name: toRequiredText(building.name, "Unnamed building"),
    code: toRequiredText(building.code, "UNKNOWN"),
  }));
}

export async function getRoomTypeOptions(): Promise<RoomTypeOption[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("room_types")
    .select("id,name,key,default_capacity")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .returns<RoomTypeOptionRow[]>();

  if (error) {
    throw new Error(`Failed to load room types: ${error.message}`);
  }

  return (data ?? []).map((roomType) => ({
    id: roomType.id,
    name: toRequiredText(roomType.name, "Unnamed room type"),
    key: toRequiredText(roomType.key, "unknown"),
    default_capacity: roomType.default_capacity,
  }));
}

export async function getAmenityOptions(): Promise<AmenityOption[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("amenities")
    .select("id,name,key")
    .eq("is_active", true)
    .order("name", { ascending: true })
    .returns<AmenityOptionRow[]>();

  if (error) {
    throw new Error(`Failed to load amenities: ${error.message}`);
  }

  return (data ?? []).map((amenity) => ({
    id: amenity.id,
    name: toRequiredText(amenity.name, "Unnamed amenity"),
    key: toRequiredText(amenity.key, "unknown"),
  }));
}