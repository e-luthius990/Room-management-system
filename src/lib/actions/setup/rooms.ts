"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { hasCampAccess } from "@/lib/auth/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { roomSchema } from "@/lib/validation/setup";

const ROOMS_PATH = "/rooms";

type BuildingCheckRow = {
  id: string;
  camp_id: string;
};

type RoomTypeCheckRow = {
  id: string;
  is_active: boolean | null;
};

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function mapRoomError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("building") ||
    normalized.includes("rooms_building_same_camp")
  ) {
    return "invalid_building";
  }

  if (
    normalized.includes("room_type") ||
    normalized.includes("rooms_room_type_id_fkey")
  ) {
    return "invalid_room_type";
  }

  if (
    normalized.includes("camp") ||
    normalized.includes("rooms_camp_id_fkey")
  ) {
    return "invalid_camp";
  }

  if (
    normalized.includes("gender") ||
    normalized.includes("rooms_gender_restriction_check")
  ) {
    return "invalid_gender_restriction";
  }

  if (
    normalized.includes("capacity") ||
    normalized.includes("rooms_capacity_check")
  ) {
    return "invalid_capacity";
  }

  if (
    normalized.includes("room_number") ||
    normalized.includes("rooms_room_number_check") ||
    normalized.includes("check")
  ) {
    return "invalid_input";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("access") ||
    normalized.includes("not authorized") ||
    normalized.includes("policy")
  ) {
    return "access_denied";
  }

  return "room_create_failed";
}

export async function createRoomAction(formData: FormData): Promise<never> {
  const currentUser = await requirePermission("rooms.create");

  const parsed = roomSchema.safeParse({
    campId: getFormString(formData, "campId"),
    buildingId: getFormString(formData, "buildingId"),
    roomTypeId: getFormString(formData, "roomTypeId"),
    roomNumber: getFormString(formData, "roomNumber"),
    floorLabel: getFormString(formData, "floorLabel"),
    sectionLabel: getFormString(formData, "sectionLabel"),
    capacity: getFormString(formData, "capacity"),
    bedType: getFormString(formData, "bedType"),
    genderRestriction: getFormString(formData, "genderRestriction"),
    isVip: getFormString(formData, "isVip"),
    isDelegateSuitable: getFormString(formData, "isDelegateSuitable"),
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(`${ROOMS_PATH}?error=invalid_input`);
  }

  if (!hasCampAccess(currentUser, parsed.data.campId, "manager")) {
    redirect(`${ROOMS_PATH}?error=camp_not_allowed`);
  }

  const supabase = await createServerSupabaseClient();

  const { data: building, error: buildingError } = await supabase
    .from("buildings")
    .select("id,camp_id")
    .eq("id", parsed.data.buildingId)
    .eq("camp_id", parsed.data.campId)
    .eq("status", "active")
    .is("deleted_at", null)
    .returns<BuildingCheckRow[]>()
    .maybeSingle();

  if (buildingError || !building) {
    redirect(`${ROOMS_PATH}?error=invalid_building`);
  }

  const { data: roomType, error: roomTypeError } = await supabase
    .from("room_types")
    .select("id,is_active")
    .eq("id", parsed.data.roomTypeId)
    .eq("is_active", true)
    .returns<RoomTypeCheckRow[]>()
    .maybeSingle();

  if (roomTypeError || !roomType) {
    redirect(`${ROOMS_PATH}?error=invalid_room_type`);
  }

  const { error } = await supabase.from("rooms").insert({
    camp_id: parsed.data.campId,
    building_id: parsed.data.buildingId,
    room_type_id: parsed.data.roomTypeId,
    room_number: parsed.data.roomNumber,
    floor_label: parsed.data.floorLabel,
    section_label: parsed.data.sectionLabel,
    capacity: parsed.data.capacity,
    bed_type: parsed.data.bedType,
    gender_restriction: parsed.data.genderRestriction,
    is_vip: parsed.data.isVip,
    is_delegate_suitable: parsed.data.isDelegateSuitable,
    notes: parsed.data.notes,
    created_by: currentUser.authUser.id,
    updated_by: currentUser.authUser.id,
  });

  if (error) {
    redirect(`${ROOMS_PATH}?error=${mapRoomError(error.message)}`);
  }

  revalidatePath(ROOMS_PATH);
  revalidatePath("/room-board");
  revalidatePath("/allocations");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reception");
  revalidatePath("/dashboard/camp-manager");
  revalidatePath("/reports");

  redirect(`${ROOMS_PATH}?success=room_created`);
}