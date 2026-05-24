"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  checkInReservationSchema,
  checkInStaySchema,
  checkOutStaySchema,
} from "@/lib/validation/stays";

type StayRpcResult = {
  id: string;
  reservation_id: string | null;
};

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getRpcStayId(value: StayRpcResult | null): string | null {
  if (value && typeof value.id === "string" && value.id.trim().length > 0) {
    return value.id;
  }

  return null;
}

function mapCheckInError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("only pending or confirmed")) {
    return "reservation_not_checkin_ready";
  }

  if (normalized.includes("group reservations")) {
    return "group_checkin_required";
  }

  if (normalized.includes("only reserved stays")) {
    return "stay_not_checkin_ready";
  }

  if (normalized.includes("room is not ready")) {
    return "room_not_ready";
  }

  if (normalized.includes("reservation not found")) {
    return "reservation_not_found";
  }

  if (normalized.includes("stay not found")) {
    return "stay_not_found";
  }

  if (normalized.includes("room not found")) {
    return "room_not_found";
  }

  if (normalized.includes("guest")) {
    return "guest_access_denied";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  return "check_in_failed";
}

function mapCheckOutError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("only checked-in or occupied")) {
    return "stay_not_checkout_ready";
  }

  if (normalized.includes("stay not found")) {
    return "stay_not_found";
  }

  if (normalized.includes("room not found")) {
    return "room_not_found";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  if (normalized.includes("invalid room status transition")) {
    return "invalid_room_status_transition";
  }

  return "check_out_failed";
}

export async function checkInReservationAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("reservations.convert_to_checkin");

  /*
   * check_in_reservation internally calls check_in_stay,
   * and check_in_stay requires stays.check_in.
   */
  await requirePermission("stays.check_in");

  const fallbackReservationId = getFormString(formData, "reservationId");

  const parsed = checkInReservationSchema.safeParse({
    reservationId: fallbackReservationId,
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(
      fallbackReservationId
        ? `/reservations/${fallbackReservationId}?error=invalid_input`
        : "/reservations?error=invalid_input",
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("check_in_reservation", {
      p_reservation_id: parsed.data.reservationId,
      ...(parsed.data.notes ? { p_notes: parsed.data.notes } : {}),
    })
    .returns<StayRpcResult>();

  const checkedInStayId = getRpcStayId(data);

  if (error || !checkedInStayId) {
    const code = mapCheckInError(error?.message ?? "check_in_failed");

    redirect(`/reservations/${parsed.data.reservationId}?error=${code}`);
  }

  revalidatePath("/reservations");
  revalidatePath(`/reservations/${parsed.data.reservationId}`);
  revalidatePath("/allocations");
  revalidatePath("/stays");
  revalidatePath(`/stays/${checkedInStayId}`);
  revalidatePath("/room-board");
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reception");
  revalidatePath("/dashboard/camp-manager");
  revalidatePath("/reports");

  redirect(`/stays/${checkedInStayId}`);
}

export async function checkInStayAction(formData: FormData): Promise<never> {
  await requirePermission("stays.check_in");

  const fallbackStayId = getFormString(formData, "stayId");

  const parsed = checkInStaySchema.safeParse({
    stayId: fallbackStayId,
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(
      fallbackStayId
        ? `/stays/${fallbackStayId}?error=invalid_input`
        : "/stays?error=invalid_input",
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("check_in_stay", {
      p_stay_id: parsed.data.stayId,
      ...(parsed.data.notes ? { p_notes: parsed.data.notes } : {}),
    })
    .returns<StayRpcResult>();

  const checkedInStayId = getRpcStayId(data);

  if (error || !checkedInStayId) {
    const code = mapCheckInError(error?.message ?? "check_in_failed");

    redirect(`/stays/${parsed.data.stayId}?error=${code}`);
  }

  revalidatePath("/allocations");
  revalidatePath("/stays");
  revalidatePath(`/stays/${parsed.data.stayId}`);
  revalidatePath(`/stays/${checkedInStayId}`);
  revalidatePath("/room-board");
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reception");
  revalidatePath("/dashboard/camp-manager");
  revalidatePath("/reports");

  redirect(`/stays/${checkedInStayId}`);
}

export async function checkOutStayAction(formData: FormData): Promise<never> {
  await requirePermission("stays.check_out");

  const fallbackStayId = getFormString(formData, "stayId");

  const parsed = checkOutStaySchema.safeParse({
    stayId: fallbackStayId,
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(
      fallbackStayId
        ? `/stays/${fallbackStayId}?error=invalid_input`
        : "/stays?error=invalid_input",
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("check_out_stay", {
      p_stay_id: parsed.data.stayId,
      ...(parsed.data.notes ? { p_notes: parsed.data.notes } : {}),
    })
    .returns<StayRpcResult>();

  const checkedOutStayId = getRpcStayId(data);

  if (error || !checkedOutStayId) {
    const code = mapCheckOutError(error?.message ?? "check_out_failed");

    redirect(`/stays/${parsed.data.stayId}?error=${code}`);
  }

  revalidatePath("/allocations");
  revalidatePath("/stays");
  revalidatePath(`/stays/${parsed.data.stayId}`);
  revalidatePath(`/stays/${checkedOutStayId}`);
  revalidatePath("/room-board");
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reception");
  revalidatePath("/dashboard/camp-manager");
  revalidatePath("/reports");

  redirect(`/stays/${checkedOutStayId}`);
}