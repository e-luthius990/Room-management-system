"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { hasCampAccess } from "@/lib/auth/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildingSchema } from "@/lib/validation/setup";

const BUILDINGS_PATH = "/admin/buildings";

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function mapBuildingError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("camp") ||
    normalized.includes("buildings_camp_id_fkey")
  ) {
    return "invalid_camp";
  }

  if (
    normalized.includes("check") ||
    normalized.includes("buildings_name_check") ||
    normalized.includes("buildings_code_check") ||
    normalized.includes("buildings_floor_count_check")
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

  return "building_create_failed";
}

export async function createBuildingAction(
  formData: FormData,
): Promise<never> {
  const currentUser = await requirePermission("buildings.create");

  const parsed = buildingSchema.safeParse({
    campId: getFormString(formData, "campId"),
    name: getFormString(formData, "name"),
    code: getFormString(formData, "code"),
    floorCount: getFormString(formData, "floorCount"),
    description: getFormString(formData, "description"),
  });

  if (!parsed.success) {
    redirect(`${BUILDINGS_PATH}?error=invalid_input`);
  }

  if (!hasCampAccess(currentUser, parsed.data.campId, "manager")) {
    redirect(`${BUILDINGS_PATH}?error=camp_not_allowed`);
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("buildings").insert({
    camp_id: parsed.data.campId,
    name: parsed.data.name,
    code: parsed.data.code,
    floor_count: parsed.data.floorCount,
    description: parsed.data.description,
    status: "active",
    created_by: currentUser.authUser.id,
    updated_by: currentUser.authUser.id,
  });

  if (error) {
    redirect(`${BUILDINGS_PATH}?error=${mapBuildingError(error.message)}`);
  }

  revalidatePath(BUILDINGS_PATH);
  revalidatePath("/admin/setup");
  revalidatePath("/rooms");
  revalidatePath("/room-board");

  redirect(`${BUILDINGS_PATH}?success=building_created`);
}