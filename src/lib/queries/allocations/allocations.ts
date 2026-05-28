import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AllocationStatus = "active" | "cancelled" | "checked_in" | "expired";

export type AllocationGuest = {
  id: string;
  full_name: string;
  organization: string | null;
  guest_category: string;
  is_vip: boolean;
  primary_camp_id: string;
  profile_photo_path: string | null;
  profile_photo_updated_at: string | null;
};

export type AllocationRoom = {
  id: string;
  camp_id: string;
  building_id: string;
  room_type_id: string;
  room_number: string;
  bed_type: string | null;
  is_vip: boolean;
  is_delegate_suitable: boolean;
  current_status: string;
  condition_status: string;
  building_name: string;
  building_code: string;
  room_type_name: string;
  room_type_key: string;
  camp_name: string;
  camp_code: string;
};

export type AllocationListItem = {
  id: string;
  stay_id: string | null;
  reservation_id: string | null;
  guest_id: string;
  room_id: string;
  camp_id: string;
  status: AllocationStatus;
  allocation_notes: string | null;
  allocated_at: string;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  guest_name: string;
  guest_organization: string | null;
  room_number: string;
  building_name: string;
  building_code: string;
  camp_name: string;
  camp_code: string;
};

export type AllocationDetail = AllocationListItem & {
  room_type_name: string;
  bed_type: string | null;
  room_status: string;
  room_condition_status: string;
  guest_category: string;
  guest_is_vip: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function relatedRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  return asRecord(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function asAllocationStatus(value: unknown): AllocationStatus {
  if (
    value === "active" ||
    value === "cancelled" ||
    value === "checked_in" ||
    value === "expired"
  ) {
    return value;
  }

  return "active";
}

export function formatAllocationDateTime(value: string | null): string {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatAllocationLabel(value: string | null | undefined): string {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function getAllocationGuests(): Promise<AllocationGuest[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("guests")
    .select(
      "id, full_name, organization, guest_category, is_vip, primary_camp_id, profile_photo_path, profile_photo_updated_at",
    )
    .is("archived_at", null)
    .order("full_name", { ascending: true })
    .limit(300);

  if (error) {
    throw new Error("Could not load guests for room allocation.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    organization: row.organization,
    guest_category: row.guest_category,
    is_vip: row.is_vip,
    primary_camp_id: row.primary_camp_id,
    profile_photo_path: row.profile_photo_path,
    profile_photo_updated_at: row.profile_photo_updated_at,
  }));
}

export async function getReadyAllocationRooms(): Promise<AllocationRoom[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("rooms")
    .select(
      `
        id,
        camp_id,
        building_id,
        room_type_id,
        room_number,
        bed_type,
        is_vip,
        is_delegate_suitable,
        current_status,
        condition_status,
        building:buildings(name, code),
        room_type:room_types(name, key),
        camp:camps(name, code)
      `,
    )
    .eq("current_status", "vacant_ready")
    .is("deleted_at", null)
    .order("room_number", { ascending: true });

  if (error) {
    throw new Error("Could not load rooms ready for allocation.");
  }

  return (data ?? []).map((row) => {
    const building = relatedRecord(row.building);
    const roomType = relatedRecord(row.room_type);
    const camp = relatedRecord(row.camp);

    return {
      id: row.id,
      camp_id: row.camp_id,
      building_id: row.building_id,
      room_type_id: row.room_type_id,
      room_number: row.room_number,
      bed_type: row.bed_type,
      is_vip: row.is_vip,
      is_delegate_suitable: row.is_delegate_suitable,
      current_status: row.current_status,
      condition_status: row.condition_status,
      building_name: asString(building.name, "Building"),
      building_code: asString(building.code, "—"),
      room_type_name: asString(roomType.name, asString(roomType.key, "Room")),
      room_type_key: asString(roomType.key, "room"),
      camp_name: asString(camp.name, "Camp"),
      camp_code: asString(camp.code, "—"),
    };
  });
}

export async function getAllocations(
  status: AllocationStatus | "all" = "active",
): Promise<AllocationListItem[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("room_allocations")
    .select(
      `
        id,
        stay_id,
        reservation_id,
        guest_id,
        room_id,
        camp_id,
        status,
        allocation_notes,
        allocated_at,
        guest:guests(full_name, organization),
        stay:stays(expected_arrival_at, expected_departure_at, status),
        room:rooms(
          room_number,
          building:buildings(name, code),
          camp:camps(name, code)
        )
      `,
    )
    .order("allocated_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("Could not load room allocations.");
  }

  return (data ?? []).map((raw) => {
    const row = asRecord(raw);
    const guest = relatedRecord(row.guest);
    const stay = relatedRecord(row.stay);
    const room = relatedRecord(row.room);
    const building = relatedRecord(room.building);
    const camp = relatedRecord(room.camp);

    return {
      id: asString(row.id),
      stay_id: asNullableString(row.stay_id),
      reservation_id: asNullableString(row.reservation_id),
      guest_id: asString(row.guest_id),
      room_id: asString(row.room_id),
      camp_id: asString(row.camp_id),
      status: asAllocationStatus(row.status),
      allocation_notes: asNullableString(row.allocation_notes),
      allocated_at: asString(row.allocated_at),
      expected_arrival_at: asNullableString(stay.expected_arrival_at),
      expected_departure_at: asNullableString(stay.expected_departure_at),
      guest_name: asString(guest.full_name, "Unnamed guest"),
      guest_organization: asNullableString(guest.organization),
      room_number: asString(room.room_number, "—"),
      building_name: asString(building.name, "Building"),
      building_code: asString(building.code, "—"),
      camp_name: asString(camp.name, "Camp"),
      camp_code: asString(camp.code, "—"),
    };
  });
}

export async function getAllocationDetail(
  allocationId: string,
): Promise<AllocationDetail | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("room_allocations")
    .select(
      `
        id,
        stay_id,
        reservation_id,
        guest_id,
        room_id,
        camp_id,
        status,
        allocation_notes,
        allocated_at,
        guest:guests(full_name, organization, guest_category, is_vip),
        stay:stays(expected_arrival_at, expected_departure_at, status),
        room:rooms(
          room_number,
          bed_type,
          current_status,
          condition_status,
          building:buildings(name, code),
          room_type:room_types(name, key),
          camp:camps(name, code)
        )
      `,
    )
    .eq("id", allocationId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load room allocation.");
  }

  if (!data) {
    return null;
  }

  const row = asRecord(data);
  const guest = relatedRecord(row.guest);
  const stay = relatedRecord(row.stay);
  const room = relatedRecord(row.room);
  const building = relatedRecord(room.building);
  const roomType = relatedRecord(room.room_type);
  const camp = relatedRecord(room.camp);

  return {
    id: asString(row.id),
    stay_id: asNullableString(row.stay_id),
    reservation_id: asNullableString(row.reservation_id),
    guest_id: asString(row.guest_id),
    room_id: asString(row.room_id),
    camp_id: asString(row.camp_id),
    status: asAllocationStatus(row.status),
    allocation_notes: asNullableString(row.allocation_notes),
    allocated_at: asString(row.allocated_at),
    expected_arrival_at: asNullableString(stay.expected_arrival_at),
    expected_departure_at: asNullableString(stay.expected_departure_at),
    guest_name: asString(guest.full_name, "Unnamed guest"),
    guest_organization: asNullableString(guest.organization),
    guest_category: asString(guest.guest_category, "guest"),
    guest_is_vip: asBoolean(guest.is_vip),
    room_number: asString(room.room_number, "—"),
    room_type_name: asString(roomType.name, asString(roomType.key, "Room")),
    bed_type: asNullableString(room.bed_type),
    room_status: asString(room.current_status, "unknown"),
    room_condition_status: asString(room.condition_status, "unknown"),
    building_name: asString(building.name, "Building"),
    building_code: asString(building.code, "—"),
    camp_name: asString(camp.name, "Camp"),
    camp_code: asString(camp.code, "—"),
  };
}
