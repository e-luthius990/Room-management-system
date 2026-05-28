"use server";

import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import {
  deleteGuestProfilePhoto,
  getProfilePhotoErrorCode,
  uploadRequiredGuestProfilePhoto,
} from "@/lib/guest-profile-photo";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const guestCategories = [
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

const optionalTrimmedText = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return null;
      }

      const trimmed = value.trim();

      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().max(maxLength).nullable(),
  );

const optionalEmail = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim().toLowerCase();

    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().email("Enter a valid email address.").max(180).nullable(),
);

const createSecurityGuestSchema = z.object({
  primaryCampId: z.string().uuid("Invalid camp."),
  fullName: z.string().trim().min(2, "Full name is required.").max(160),
  gender: optionalTrimmedText(40),
  nationality: optionalTrimmedText(100),
  organization: optionalTrimmedText(180),
  departmentOrProject: optionalTrimmedText(180),
  guestCategory: z.enum(guestCategories),
  phone: optionalTrimmedText(60),
  email: optionalEmail,
  idOrPassportNumber: optionalTrimmedText(120),
  notes: optionalTrimmedText(1500),
  isVip: z.boolean(),
});

type CreateSecurityGuestInput = z.infer<typeof createSecurityGuestSchema>;

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getFormBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function optionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeSecurityGuestError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("permission") ||
    normalized.includes("access") ||
    normalized.includes("not authorized") ||
    normalized.includes("row-level security") ||
    normalized.includes("violates row-level security") ||
    normalized.includes("rls")
  ) {
    return "access_denied";
  }

  if (
    normalized.includes("foreign key") ||
    normalized.includes("primary_camp_id") ||
    normalized.includes("camp")
  ) {
    return "invalid_camp";
  }

  if (
    normalized.includes("guest_category") ||
    normalized.includes("invalid input value for enum")
  ) {
    return "invalid_guest_category";
  }

  if (normalized.includes("email")) {
    return "invalid_email";
  }

  if (normalized.includes("gender")) {
    return "invalid_gender";
  }

  if (
    normalized.includes("duplicate") ||
    normalized.includes("unique constraint")
  ) {
    return "possible_duplicate_guest";
  }

  return "guest_create_failed";
}

function buildGuestInsertPayload(
  input: CreateSecurityGuestInput,
  guestId: string,
  actorId: string,
  photoMetadata: Awaited<ReturnType<typeof uploadRequiredGuestProfilePhoto>>,
) {
  const isVip = input.isVip || input.guestCategory === "vip_guest";

  return {
    id: guestId,
    primary_camp_id: input.primaryCampId,
    full_name: input.fullName,
    gender: optionalText(input.gender),
    nationality: optionalText(input.nationality),
    organization: optionalText(input.organization),
    department_or_project: optionalText(input.departmentOrProject),
    guest_category: input.guestCategory,
    phone: optionalText(input.phone),
    email: optionalText(input.email),
    id_or_passport_number: optionalText(input.idOrPassportNumber),
    notes: optionalText(input.notes),
    is_vip: isVip,
    security_clearance_status: "pending",
    created_by: actorId,
    updated_by: actorId,
    ...photoMetadata,
  };
}

function revalidateSecurityGuestPaths(guestId: string): void {
  revalidatePath(APP_ROUTES.security.review);
  revalidatePath(APP_ROUTES.security.gate);
  revalidatePath(APP_ROUTES.security.pendingReception);
  revalidatePath(APP_ROUTES.security.home);
  revalidatePath(APP_ROUTES.security.guestProfile(guestId));

  revalidatePath("/dashboard/security");
  revalidatePath("/dashboard/reception");
  revalidatePath("/reception/security-handoffs");
}

export async function createSecurityGuestAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("security.create_guest_intake");

  const parsed = createSecurityGuestSchema.safeParse({
    primaryCampId: getFormString(formData, "primaryCampId"),
    fullName: getFormString(formData, "fullName"),
    gender: getFormString(formData, "gender"),
    nationality: getFormString(formData, "nationality"),
    organization: getFormString(formData, "organization"),
    departmentOrProject: getFormString(formData, "departmentOrProject"),
    guestCategory: getFormString(formData, "guestCategory"),
    phone: getFormString(formData, "phone"),
    email: getFormString(formData, "email"),
    idOrPassportNumber: getFormString(formData, "idOrPassportNumber"),
    notes: getFormString(formData, "notes"),
    isVip: getFormBoolean(formData, "isVip"),
  });

  if (!parsed.success) {
    redirect(`${APP_ROUTES.security.newGuest}?error=invalid_input`);
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`${APP_ROUTES.security.newGuest}?error=access_denied`);
  }

  const guestId = randomUUID();
  let photoMetadata: Awaited<ReturnType<typeof uploadRequiredGuestProfilePhoto>>;

  try {
    photoMetadata = await uploadRequiredGuestProfilePhoto(formData, guestId);
  } catch (error) {
    redirect(
      `${APP_ROUTES.security.newGuest}?error=${getProfilePhotoErrorCode(error)}`,
    );
  }

  const { error } = await supabase
    .from("guests")
    .insert(buildGuestInsertPayload(parsed.data, guestId, user.id, photoMetadata));

  if (error) {
    await deleteGuestProfilePhoto(photoMetadata);

    console.error("Security guest intake insert failed", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      campId: parsed.data.primaryCampId,
      guestCategory: parsed.data.guestCategory,
      gender: parsed.data.gender,
    });

    const code = normalizeSecurityGuestError(error.message);

    redirect(`${APP_ROUTES.security.newGuest}?error=${code}`);
  }

  revalidateSecurityGuestPaths(guestId);

  redirect(`${APP_ROUTES.security.guestProfile(guestId)}?success=guest_created`);
}
