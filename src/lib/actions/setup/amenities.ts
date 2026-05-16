"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { amenitySchema } from "@/lib/validation/setup";

const AMENITIES_PATH = "/admin/amenities";

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function mapAmenityError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("duplicate") ||
    normalized.includes("unique") ||
    normalized.includes("amenities_key_key")
  ) {
    return "duplicate_amenity";
  }

  if (
    normalized.includes("check") ||
    normalized.includes("amenities_key_check") ||
    normalized.includes("amenities_name_check")
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

  return "amenity_create_failed";
}

export async function createAmenityAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("rooms.manage_amenities");

  const parsed = amenitySchema.safeParse({
    key: getFormString(formData, "key"),
    name: getFormString(formData, "name"),
  });

  if (!parsed.success) {
    redirect(`${AMENITIES_PATH}?error=invalid_input`);
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("amenities").insert({
    key: parsed.data.key,
    name: parsed.data.name,
    is_active: true,
  });

  if (error) {
    redirect(`${AMENITIES_PATH}?error=${mapAmenityError(error.message)}`);
  }

  revalidatePath(AMENITIES_PATH);
  revalidatePath("/admin/setup");
  revalidatePath("/rooms");

  redirect(`${AMENITIES_PATH}?success=amenity_created`);
}