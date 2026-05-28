"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { notifyWorkflowPermission } from "@/lib/notifications/workflow-notifications";
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

async function notifyReservationWorkflow(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  reservationId: string,
  event: "cancelled" | "no_show",
): Promise<void> {
  const { data, error } = await supabase
    .from("reservations")
    .select("id,camp_id,guests(full_name)")
    .eq("id", reservationId)
    .returns<
      {
        id: string;
        camp_id: string;
        guests: { full_name: string | null } | null;
      }[]
    >()
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to load reservation notification context:", error.message);
    }

    return;
  }

  const guestName = data.guests?.full_name ?? "A guest";

  await notifyWorkflowPermission({
    permission: "reservations.view",
    campId: data.camp_id,
    title:
      event === "cancelled"
        ? "Reservation cancelled"
        : "Reservation marked no-show",
    body:
      event === "cancelled"
        ? `${guestName}'s reservation was cancelled.`
        : `${guestName}'s reservation was marked no-show.`,
    category: "reservation",
    severity: "warning",
    actionHref: `/reservations/${data.id}`,
    entityType: "reservations",
    entityId: data.id,
  });
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
  await notifyReservationWorkflow(supabase, parsed.data.reservationId, "cancelled");

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
  await notifyReservationWorkflow(supabase, parsed.data.reservationId, "no_show");

  redirect(
    buildReservationRedirectPath(parsed.data.reservationId, {
      success: "reservation_no_show",
    }),
  );
}
