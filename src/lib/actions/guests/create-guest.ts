"use server";

import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { hasCampAccess } from "@/lib/auth/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createGuestSchema } from "@/lib/validation/guests";

const dbGuestCategories = [
  "eu_delegate",
  "american_delegate",
  "government_official",
  "company_staff",
  "contractor",
  "consultant",
  "visitor",
  "transit_guest",
  "vip_guest",
  "long_stay_guest",
] as const;

type DbGuestCategory = (typeof dbGuestCategories)[number];

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDbGuestCategory(value: string): DbGuestCategory | null {
  if (dbGuestCategories.includes(value as DbGuestCategory)) {
    return value as DbGuestCategory;
  }

  return null;
}

function redirectWithGuestCreateError(message: string | undefined): never {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("duplicate")) {
    redirect("/guests/new?error=duplicate_guest");
  }

  if (normalized.includes("full_name") || normalized.includes("full name")) {
    redirect("/guests/new?error=invalid_name");
  }

  if (normalized.includes("gender")) {
    redirect("/guests/new?error=invalid_gender");
  }

  if (normalized.includes("camp")) {
    redirect("/guests/new?error=camp_not_allowed");
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("access") ||
    normalized.includes("row-level security") ||
    normalized.includes("violates row-level security")
  ) {
    redirect("/guests/new?error=access_denied");
  }

  redirect("/guests/new?error=create_failed");
}

export async function createGuestAction(formData: FormData): Promise<never> {
  const currentUser = await requirePermission("guests.create");

  const parsed = createGuestSchema.safeParse({
    fullName: getFormString(formData, "fullName"),
    primaryCampId: getFormString(formData, "primaryCampId"),
    guestCategory: getFormString(formData, "guestCategory"),

    gender: getFormString(formData, "gender"),

    organizationName: getFormString(formData, "organizationName"),
    departmentOrProject: getFormString(formData, "departmentOrProject"),
    nationality: getFormString(formData, "nationality"),

    phone: getFormString(formData, "phone"),
    email: getFormString(formData, "email"),

    idOrPassportNumber: getFormString(formData, "idOrPassportNumber"),
    emergencyContactName: getFormString(formData, "emergencyContactName"),
    emergencyContactPhone: getFormString(formData, "emergencyContactPhone"),

    isVip: formData.get("isVip"),

    securityClearanceStatus: getFormString(
      formData,
      "securityClearanceStatus",
    ),

    notes: getFormString(formData, "notes"),
    managerNotes: getFormString(formData, "managerNotes"),
  });

  if (!parsed.success) {
    redirect("/guests/new?error=invalid_input");
  }

  const guestCategory = normalizeDbGuestCategory(parsed.data.guestCategory);

  if (!guestCategory) {
    redirect("/guests/new?error=invalid_input");
  }

  if (!hasCampAccess(currentUser, parsed.data.primaryCampId, "operator")) {
    redirect("/guests/new?error=camp_not_allowed");
  }

  const supabase = await createServerSupabaseClient();
  const guestId = randomUUID();

  const { error: guestError } = await supabase.from("guests").insert({
    id: guestId,

    full_name: parsed.data.fullName,
    primary_camp_id: parsed.data.primaryCampId,
    guest_category: guestCategory,

    gender: parsed.data.gender,
    nationality: parsed.data.nationality,
    organization: parsed.data.organizationName,
    department_or_project: parsed.data.departmentOrProject,

    phone: parsed.data.phone,
    email: parsed.data.email,

    id_or_passport_number: parsed.data.idOrPassportNumber,
    emergency_contact_name: parsed.data.emergencyContactName,
    emergency_contact_phone: parsed.data.emergencyContactPhone,

    is_vip: parsed.data.isVip,
    security_clearance_status: parsed.data.securityClearanceStatus,

    notes: parsed.data.notes,
    manager_notes: parsed.data.managerNotes,
  });

  if (guestError) {
    console.error("createGuestAction failed", {
      code: guestError.code,
      message: guestError.message,
      details: guestError.details,
      hint: guestError.hint,
      primaryCampId: parsed.data.primaryCampId,
    });

    redirectWithGuestCreateError(guestError.message);
  }

  revalidatePath("/guests");
  revalidatePath(`/guests/${guestId}`);

  redirect(`/guests/${guestId}?success=guest_created`);
}