"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  cancelReservationSchema,
  noShowReservationSchema,
} from "@/lib/validation/reservations";

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function buildReservationRedirectPath(
  reservationId: string | null,
  params: Record<string, string>,
): string {
  const searchParams = new URLSearchParams(params);

  if (!reservationId) {
    return `/reservations?${searchParams.toString()}`;
  }

  return `/reservations/${encodeURIComponent(
    reservationId,
  )}?${searchParams.toString()}`;
}

function mapReservationWorkflowError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("not found")) {
    return "reservation_not_found";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  if (normalized.includes("reason")) {
    return "reason_required";
  }

  if (
    normalized.includes("status") ||
    normalized.includes("pending") ||
    normalized.includes("confirmed") ||
    normalized.includes("checked")
  ) {
    return "invalid_reservation_status";
  }

  return "workflow_failed";
}

function revalidateReservationWorkflow(reservationId: string): void {
  revalidatePath("/reservations");
  revalidatePath(`/reservations/${reservationId}`);
  revalidatePath("/room-board");
  revalidatePath("/stays");
}

export async function cancelReservationAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("reservations.cancel");

  const reservationId = getFormString(formData, "reservationId");

  const parsed = cancelReservationSchema.safeParse({
    reservationId,
    reason: getFormString(formData, "reason"),
  });

  if (!parsed.success) {
    redirect(
      buildReservationRedirectPath(reservationId, {
        error: "invalid_input",
      }),
    );
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("cancel_reservation", {
    p_reservation_id: parsed.data.reservationId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    redirect(
      buildReservationRedirectPath(parsed.data.reservationId, {
        error: mapReservationWorkflowError(error.message),
      }),
    );
  }

  revalidateReservationWorkflow(parsed.data.reservationId);

  redirect(
    buildReservationRedirectPath(parsed.data.reservationId, {
      success: "reservation_cancelled",
    }),
  );
}

export async function markReservationNoShowAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("reservations.mark_no_show");

  const reservationId = getFormString(formData, "reservationId");

  const parsed = noShowReservationSchema.safeParse({
    reservationId,
    reason: getFormString(formData, "reason"),
  });

  if (!parsed.success) {
    redirect(
      buildReservationRedirectPath(reservationId, {
        error: "invalid_input",
      }),
    );
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("mark_reservation_no_show", {
    p_reservation_id: parsed.data.reservationId,
    p_reason: parsed.data.reason ?? undefined,
  });

  if (error) {
    redirect(
      buildReservationRedirectPath(parsed.data.reservationId, {
        error: mapReservationWorkflowError(error.message),
      }),
    );
  }

  revalidateReservationWorkflow(parsed.data.reservationId);

  redirect(
    buildReservationRedirectPath(parsed.data.reservationId, {
      success: "reservation_no_show",
    }),
  );
}