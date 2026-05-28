"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { hasCampAccess } from "@/lib/auth/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getProfilePhotoErrorCode,
  uploadOptionalGuestProfilePhoto,
} from "@/lib/guest-profile-photo";
import { updateGuestSchema } from "@/lib/validation/guests";

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

function buildGuestRedirectPath(
  guestId: string | null,
  params: Record<string, string>,
): string {
  const searchParams = new URLSearchParams(params);

  if (!guestId) {
    return `/guests?${searchParams.toString()}`;
  }

  return `/guests/${encodeURIComponent(guestId)}?${searchParams.toString()}`;
}

function normalizeDbGuestCategory(value: string): DbGuestCategory | null {
  if (dbGuestCategories.includes(value as DbGuestCategory)) {
    return value as DbGuestCategory;
  }

  return null;
}

function redirectWithGuestUpdateError(
  guestId: string,
  message: string | undefined,
): never {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("duplicate")) {
    redirect(
      buildGuestRedirectPath(guestId, {
        error: "duplicate_guest",
      }),
    );
  }

  if (normalized.includes("full_name") || normalized.includes("full name")) {
    redirect(
      buildGuestRedirectPath(guestId, {
        error: "invalid_name",
      }),
    );
  }

  if (normalized.includes("gender")) {
    redirect(
      buildGuestRedirectPath(guestId, {
        error: "invalid_gender",
      }),
    );
  }

  if (normalized.includes("camp")) {
    redirect(
      buildGuestRedirectPath(guestId, {
        error: "camp_not_allowed",
      }),
    );
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("access") ||
    normalized.includes("row-level security") ||
    normalized.includes("violates row-level security")
  ) {
    redirect(
      buildGuestRedirectPath(guestId, {
        error: "access_denied",
      }),
    );
  }

  redirect(
    buildGuestRedirectPath(guestId, {
      error: "update_failed",
    }),
  );
}

export async function updateGuestAction(formData: FormData): Promise<never> {
  const currentUser = await requirePermission("guests.update");

  const guestId = getFormString(formData, "guestId");

  const parsed = updateGuestSchema.safeParse({
    guestId,
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
    redirect(
      buildGuestRedirectPath(guestId, {
        error: "invalid_input",
      }),
    );
  }

  const guestCategory = normalizeDbGuestCategory(parsed.data.guestCategory);

  if (!guestCategory) {
    redirect(
      buildGuestRedirectPath(parsed.data.guestId, {
        error: "invalid_input",
      }),
    );
  }

  if (!hasCampAccess(currentUser, parsed.data.primaryCampId, "operator")) {
    redirect(
      buildGuestRedirectPath(parsed.data.guestId, {
        error: "camp_not_allowed",
      }),
    );
  }

  const supabase = await createServerSupabaseClient();
  let photoMetadata: Awaited<ReturnType<typeof uploadOptionalGuestProfilePhoto>>;

  try {
    photoMetadata = await uploadOptionalGuestProfilePhoto(
      formData,
      parsed.data.guestId,
    );
  } catch (error) {
    redirect(
      buildGuestRedirectPath(parsed.data.guestId, {
        error: getProfilePhotoErrorCode(error),
      }),
    );
  }

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .update({
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
      ...(photoMetadata ?? {}),
    })
    .eq("id", parsed.data.guestId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (guestError) {
    redirectWithGuestUpdateError(parsed.data.guestId, guestError.message);
  }

  if (!guest) {
    redirect(
      buildGuestRedirectPath(parsed.data.guestId, {
        error: "guest_not_found",
      }),
    );
  }

  revalidatePath("/guests");
  revalidatePath(`/guests/${parsed.data.guestId}`);

  redirect(
    buildGuestRedirectPath(parsed.data.guestId, {
      success: "guest_updated",
    }),
  );
}
