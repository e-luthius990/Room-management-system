"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createReservationSchema } from "@/lib/validation/reservations";

type CreatedReservationRow = {
  id: string;
};

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function mapReservationError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("overlap") ||
    normalized.includes("overlapping") ||
    normalized.includes("available") ||
    normalized.includes("reserved")
  ) {
    return "room_unavailable";
  }

  if (normalized.includes("maintenance")) {
    return "room_has_maintenance";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  if (
    normalized.includes("departure") ||
    normalized.includes("arrival") ||
    normalized.includes("date")
  ) {
    return "invalid_dates";
  }

  if (normalized.includes("guest")) {
    return "guest_not_found";
  }

  if (normalized.includes("room")) {
    return "room_not_found";
  }

  return "create_failed";
}

export async function createReservationAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("reservations.create");

  const parsed = createReservationSchema.safeParse({
    guestId: getFormString(formData, "guestId"),
    groupId: getFormString(formData, "groupId"),
    roomId: getFormString(formData, "roomId"),
    expectedArrivalAt: getFormString(formData, "expectedArrivalAt"),
    expectedDepartureAt: getFormString(formData, "expectedDepartureAt"),
    isVipHold: formData.get("isVipHold"),
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(`${APP_ROUTES.reservations.new}?error=invalid_input`);
  }

  const supabase = await createServerSupabaseClient();

  const { data: reservation, error } = await supabase
    .rpc("create_reservation", {
      p_guest_id: parsed.data.guestId,
      p_group_id: (parsed.data.groupId ?? null) as unknown as string,
      p_room_id: parsed.data.roomId,
      p_expected_arrival_at: parsed.data.expectedArrivalAt,
      p_expected_departure_at: parsed.data.expectedDepartureAt,
      p_is_vip_hold: parsed.data.isVipHold,
      p_notes: parsed.data.notes ?? undefined,
    })
    .returns<CreatedReservationRow>();

  if (error || !reservation?.id) {
    const code = mapReservationError(error?.message ?? "create_failed");
    redirect(`${APP_ROUTES.reservations.new}?error=${code}`);
  }

  revalidatePath(APP_ROUTES.reservations.list);
  revalidatePath(APP_ROUTES.reservations.detail(reservation.id));
  revalidatePath("/room-board");
  revalidatePath("/stays");

  redirect(APP_ROUTES.reservations.detail(reservation.id));
}