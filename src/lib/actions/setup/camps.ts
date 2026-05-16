"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { campSchema } from "@/lib/validation/setup";

const CAMPS_PATH = "/admin/camps";

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function mapCampError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("duplicate") ||
    normalized.includes("unique") ||
    normalized.includes("camps_code_key")
  ) {
    return "duplicate_camp_code";
  }

  if (
    normalized.includes("check") ||
    normalized.includes("camps_code_check") ||
    normalized.includes("camps_name_check")
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

  return "camp_create_failed";
}

export async function createCampAction(formData: FormData): Promise<never> {
  const currentUser = await requirePermission("camps.create");

  const parsed = campSchema.safeParse({
    name: getFormString(formData, "name"),
    code: getFormString(formData, "code"),
    location: getFormString(formData, "location"),
    description: getFormString(formData, "description"),
  });

  if (!parsed.success) {
    redirect(`${CAMPS_PATH}?error=invalid_input`);
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.from("camps").insert({
    name: parsed.data.name,
    code: parsed.data.code,
    location: parsed.data.location,
    description: parsed.data.description,
    status: "active",
    created_by: currentUser.authUser.id,
    updated_by: currentUser.authUser.id,
  });

  if (error) {
    redirect(`${CAMPS_PATH}?error=${mapCampError(error.message)}`);
  }

  revalidatePath(CAMPS_PATH);
  revalidatePath("/admin/setup");
  revalidatePath("/rooms");
  revalidatePath("/room-board");
  revalidatePath("/reports");

  redirect(`${CAMPS_PATH}?success=camp_created`);
}