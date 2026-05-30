"use server";

import "server-only";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { hasCampAccess } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import type { CurrentUserContext } from "@/lib/auth/types";
import type { Database } from "@/lib/db/types";
import {
  deleteGuestProfilePhoto,
  getProfilePhotoErrorCode,
  uploadRequiredGuestProfilePhoto,
} from "@/lib/guest-profile-photo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

const createReturningSecurityVisitSchema = z.object({
  guestId: z.string().uuid("Invalid guest."),
  campId: z.string().uuid("Invalid camp."),
  notes: optionalTrimmedText(1500),
});

type CreateReturningSecurityVisitInput = z.infer<
  typeof createReturningSecurityVisitSchema
>;

type SecurityClearanceEventInsert =
  Database["public"]["Tables"]["security_clearance_events"]["Insert"];

type ExistingGuestRow = {
  id: string;
  primary_camp_id: string;
  full_name: string;
  security_clearance_status: string | null;
};

type SupabaseQueryResult<T> = {
  data: T | null;
  error: {
    message: string;
  } | null;
};

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

function normalizeComparableText(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ");

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

function buildReturningGuestNote(input: CreateSecurityGuestInput): string {
  const details = [
    `Returning guest intake for ${input.fullName}.`,
    input.notes,
    input.organization ? `Organization: ${input.organization}.` : null,
    input.phone ? `Phone: ${input.phone}.` : null,
    input.idOrPassportNumber
      ? `ID/passport: ${input.idOrPassportNumber}.`
      : null,
  ].filter((value): value is string => Boolean(value));

  return details.join("\n");
}

function buildSelectedReturningGuestNote(
  input: CreateReturningSecurityVisitInput,
  guest: ExistingGuestRow,
): string {
  const details = [
    `Returning guest visit started for ${guest.full_name}.`,
    input.notes,
  ].filter((value): value is string => Boolean(value));

  return details.join("\n");
}

function canUseExistingGuest(
  currentUser: CurrentUserContext,
  guest: ExistingGuestRow | null,
  campId: string,
): guest is ExistingGuestRow {
  return Boolean(guest && hasCampAccess(currentUser, campId, "operator"));
}

async function firstExistingGuestResult(
  query: PromiseLike<SupabaseQueryResult<ExistingGuestRow[]>>,
): Promise<ExistingGuestRow | null> {
  const { data, error } = await query;

  if (error) {
    console.error("Security guest lookup failed:", error.message);
    return null;
  }

  return data?.[0] ?? null;
}

async function findExistingGuestById(
  guestId: string,
): Promise<ExistingGuestRow | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("guests")
    .select("id,primary_camp_id,full_name,security_clearance_status")
    .eq("id", guestId)
    .is("archived_at", null)
    .maybeSingle<ExistingGuestRow>();

  if (error) {
    console.error("Security guest lookup failed:", error.message);
    return null;
  }

  return data ?? null;
}

async function findExistingGuest(
  input: CreateSecurityGuestInput,
): Promise<ExistingGuestRow | null> {
  const admin = createSupabaseAdminClient();
  const columns = "id,primary_camp_id,full_name,security_clearance_status";
  const documentNumber = normalizeComparableText(input.idOrPassportNumber);
  const email = normalizeComparableText(input.email)?.toLowerCase() ?? null;
  const phone = normalizeComparableText(input.phone);
  const fullName = normalizeComparableText(input.fullName);

  if (documentNumber) {
    const guest = await firstExistingGuestResult(
      admin
        .from("guests")
        .select(columns)
        .is("archived_at", null)
        .ilike("id_or_passport_number", documentNumber)
        .order("updated_at", { ascending: false })
        .limit(1)
        .returns<ExistingGuestRow[]>(),
    );

    if (guest) {
      return guest;
    }
  }

  if (email) {
    const guest = await firstExistingGuestResult(
      admin
        .from("guests")
        .select(columns)
        .is("archived_at", null)
        .eq("email", email)
        .order("updated_at", { ascending: false })
        .limit(1)
        .returns<ExistingGuestRow[]>(),
    );

    if (guest) {
      return guest;
    }
  }

  if (phone && fullName) {
    return firstExistingGuestResult(
      admin
        .from("guests")
        .select(columns)
        .is("archived_at", null)
        .eq("phone", phone)
        .ilike("full_name", fullName)
        .order("updated_at", { ascending: false })
        .limit(1)
        .returns<ExistingGuestRow[]>(),
    );
  }

  return null;
}

async function isGuestCurrentlyInsideCamp(
  guestId: string,
  campId: string,
): Promise<boolean> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("security_clearance_events")
    .select("id")
    .eq("guest_id", guestId)
    .eq("camp_id", campId)
    .not("entry_at", "is", null)
    .is("exit_at", null)
    .limit(1);

  if (error) {
    console.error("Active security presence lookup failed:", {
      message: error.message,
      guestId,
      campId,
    });

    return true;
  }

  return (data?.length ?? 0) > 0;
}

async function createReturningGuestSecurityEvent({
  note,
  guest,
  campId,
  actorId,
}: {
  note: string;
  guest: ExistingGuestRow;
  campId: string;
  actorId: string;
}): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const clearanceStatus = guest.security_clearance_status ?? "pending";
  const now = new Date().toISOString();
  const payload: SecurityClearanceEventInsert = {
    guest_id: guest.id,
    camp_id: campId,
    clearance_status: clearanceStatus,
    previous_status: clearanceStatus,
    new_status: clearanceStatus,
    risk_level: "normal",
    event_type: "gate_entry",
    visit_type: "day_visitor",
    entry_at: now,
    note,
    notes: note,
    created_by: actorId,
  };

  const { data: event, error } = await admin
    .from("security_clearance_events")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error || !event?.id) {
    console.error("Returning guest security event insert failed", {
      message: error?.message,
      guestId: guest.id,
      campId,
    });

    return false;
  }

  return true;
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
  const currentUser = await requirePermission("security.create_guest_intake");

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

  const existingGuest = await findExistingGuest(parsed.data);

  if (canUseExistingGuest(currentUser, existingGuest, parsed.data.primaryCampId)) {
    const isInside = await isGuestCurrentlyInsideCamp(
      existingGuest.id,
      parsed.data.primaryCampId,
    );

    if (isInside) {
      redirect(`${APP_ROUTES.security.newGuest}?error=guest_already_inside`);
    }

    const createdEvent = await createReturningGuestSecurityEvent({
      note: buildReturningGuestNote(parsed.data),
      guest: existingGuest,
      campId: parsed.data.primaryCampId,
      actorId: currentUser.authUser.id,
    });

    if (!createdEvent) {
      redirect(`${APP_ROUTES.security.newGuest}?error=guest_create_failed`);
    }

    revalidateSecurityGuestPaths(existingGuest.id);

    redirect(
      `${APP_ROUTES.security.guestProfile(
        existingGuest.id,
      )}?success=returning_guest_recorded`,
    );
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
    .insert(
      buildGuestInsertPayload(
        parsed.data,
        guestId,
        currentUser.authUser.id,
        photoMetadata,
      ),
    );

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

export async function createReturningSecurityVisitAction(
  formData: FormData,
): Promise<never> {
  const currentUser = await requirePermission("security.create_guest_intake");

  const parsed = createReturningSecurityVisitSchema.safeParse({
    guestId: getFormString(formData, "guestId"),
    campId: getFormString(formData, "campId"),
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(`${APP_ROUTES.security.newGuest}?error=invalid_input`);
  }

  const guest = await findExistingGuestById(parsed.data.guestId);

  if (!canUseExistingGuest(currentUser, guest, parsed.data.campId)) {
    redirect(`${APP_ROUTES.security.newGuest}?error=access_denied`);
  }

  const isInside = await isGuestCurrentlyInsideCamp(
    guest.id,
    parsed.data.campId,
  );

  if (isInside) {
    redirect(`${APP_ROUTES.security.newGuest}?error=guest_already_inside`);
  }

  const createdEvent = await createReturningGuestSecurityEvent({
    note: buildSelectedReturningGuestNote(parsed.data, guest),
    guest,
    campId: parsed.data.campId,
    actorId: currentUser.authUser.id,
  });

  if (!createdEvent) {
    redirect(`${APP_ROUTES.security.newGuest}?error=guest_create_failed`);
  }

  revalidateSecurityGuestPaths(guest.id);

  redirect(
    `${APP_ROUTES.security.guestProfile(
      guest.id,
    )}?success=returning_guest_recorded`,
  );
}
