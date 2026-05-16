"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { roomTypeSchema } from "@/lib/validation/setup";

const ROOM_TYPES_PATH = "/admin/room-types";

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function mapRoomTypeError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("duplicate") ||
    normalized.includes("unique") ||
    normalized.includes("room_types_key_key")
  ) {
    return "duplicate_room_type";
  }

  if (
    normalized.includes("check") ||
    normalized.includes("room_types_key_check") ||
    normalized.includes("room_types_name_check") ||
    normalized.includes("room_types_default_capacity_check")
  ) {
    return "invalid_input";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("access") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  return "room_type_create_failed";
}

export async function createRoomTypeAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("settings.update_room_types");

  const parsed = roomTypeSchema.safeParse({
    key: getFormString(formData, "key"),
    name: getFormString(formData, "name"),
    description: getFormString(formData, "description"),
    defaultCapacity: getFormString(formData, "defaultCapacity"),
  });

  if (!parsed.success) {
    redirect(`${ROOM_TYPES_PATH}?error=invalid_input`);
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("room_types").insert({
    key: parsed.data.key,
    name: parsed.data.name,
    description: parsed.data.description,
    default_capacity: parsed.data.defaultCapacity,
    is_active: true,
  });

  if (error) {
    redirect(`${ROOM_TYPES_PATH}?error=${mapRoomTypeError(error.message)}`);
  }

  revalidatePath(ROOM_TYPES_PATH);
  revalidatePath("/admin/setup");
  revalidatePath("/rooms");
  revalidatePath("/room-board");

  redirect(`${ROOM_TYPES_PATH}?success=room_type_created`);
}