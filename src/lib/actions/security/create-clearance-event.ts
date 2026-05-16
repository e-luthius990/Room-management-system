"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSecurityClearanceEventSchema,
  markSecurityGateExitSchema,
  recordSecurityGateEntrySchema,
  sendGuestToReceptionSchema,
} from "@/lib/validation/security";

const SECURITY_PATH = "/security";

type CreateSecurityClearanceEventResult = string | { id: string };

type SecurityClearanceEventResult =
  | string
  | {
      id: string;
      guest_id?: string | null;
    };

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function nullToUndefined<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

function getResultId(value: SecurityClearanceEventResult | null): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.id === "string" &&
    value.id.trim().length > 0
  ) {
    return value.id;
  }

  return null;
}

function getResultGuestId(
  value: SecurityClearanceEventResult | null,
): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.guest_id === "string" &&
    value.guest_id.trim().length > 0
  ) {
    return value.guest_id;
  }

  return null;
}

function mapSecurityError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("guest not found")) {
    return "guest_not_found";
  }

  if (normalized.includes("security event not found")) {
    return "security_event_not_found";
  }

  if (
    normalized.includes("already has an open gate entry") ||
    normalized.includes("open gate entry")
  ) {
    return "guest_already_inside";
  }

  if (
    normalized.includes("already been marked as left") ||
    normalized.includes("already exited") ||
    normalized.includes("already been marked")
  ) {
    return "guest_already_departed";
  }

  if (
    normalized.includes("invalid security clearance") ||
    normalized.includes("clearance status")
  ) {
    return "invalid_clearance_status";
  }

  if (normalized.includes("invalid visit type")) {
    return "invalid_visit_type";
  }

  if (normalized.includes("risk")) {
    return "invalid_risk_level";
  }

  if (normalized.includes("notes are required")) {
    return "security_notes_required";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  return "security_action_failed";
}

function revalidateSecurityPaths(guestId?: string | null): void {
  revalidatePath(SECURITY_PATH);
  revalidatePath(`${SECURITY_PATH}/gate`);
  revalidatePath(`${SECURITY_PATH}/pending-reception`);
  revalidatePath("/dashboard/security");
  revalidatePath("/guest-operations");
  revalidatePath("/reports");

  if (guestId) {
    revalidatePath(`${SECURITY_PATH}/guests/${guestId}`);
    revalidatePath(`/guests/${guestId}`);
  }
}

export async function createSecurityClearanceEventAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("security.update_clearance_status");

  const fallbackGuestId = getFormString(formData, "guestId");

  const parsed = createSecurityClearanceEventSchema.safeParse({
    guestId: fallbackGuestId,
    newStatus: getFormString(formData, "newStatus"),
    riskLevel: getFormString(formData, "riskLevel"),
    notes: getFormString(formData, "notes"),
    expiresAt: getFormString(formData, "expiresAt"),
  });

  if (!parsed.success) {
    redirect(
      fallbackGuestId
        ? `${SECURITY_PATH}/guests/${fallbackGuestId}?error=invalid_input`
        : `${SECURITY_PATH}?error=invalid_input`,
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("create_security_clearance_event", {
      p_guest_id: parsed.data.guestId,
      p_new_status: parsed.data.newStatus,
      p_risk_level: parsed.data.riskLevel,
      p_notes: parsed.data.notes ?? "",
      p_expires_at: nullToUndefined(parsed.data.expiresAt),
    })
    .returns<CreateSecurityClearanceEventResult>();

  const eventId = getResultId(data);

  if (error || !eventId) {
    const code = mapSecurityError(error?.message ?? "clearance_update_failed");

    redirect(`${SECURITY_PATH}/guests/${parsed.data.guestId}?error=${code}`);
  }

  revalidateSecurityPaths(parsed.data.guestId);

  redirect(
    `${SECURITY_PATH}/guests/${parsed.data.guestId}?success=clearance_updated`,
  );
}

export async function recordSecurityGateEntryAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("security.record_gate_entry");

  const fallbackGuestId = getFormString(formData, "guestId");

  const parsed = recordSecurityGateEntrySchema.safeParse({
    guestId: fallbackGuestId,
    campId: getFormString(formData, "campId"),
    visitType: getFormString(formData, "visitType"),
    clearanceStatus: getFormString(formData, "clearanceStatus") ?? "cleared",
    riskLevel: getFormString(formData, "riskLevel") ?? "normal",
    purpose: getFormString(formData, "purpose"),
    hostName: getFormString(formData, "hostName"),
    hostDepartment: getFormString(formData, "hostDepartment"),
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(
      fallbackGuestId
        ? `${SECURITY_PATH}/guests/${fallbackGuestId}?error=invalid_gate_entry`
        : `${SECURITY_PATH}/gate?error=invalid_gate_entry`,
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("record_security_gate_entry", {
      p_guest_id: parsed.data.guestId,
      p_camp_id: parsed.data.campId,
      p_visit_type: parsed.data.visitType,
      p_purpose: nullToUndefined(parsed.data.purpose),
      p_host_name: nullToUndefined(parsed.data.hostName),
      p_host_department: nullToUndefined(parsed.data.hostDepartment),
      p_clearance_status: parsed.data.clearanceStatus,
      p_risk_level: parsed.data.riskLevel,
      p_notes: nullToUndefined(parsed.data.notes),
    })
    .returns<SecurityClearanceEventResult>();

  const eventId = getResultId(data);

  if (error || !eventId) {
    const code = mapSecurityError(error?.message ?? "gate_entry_failed");

    redirect(`${SECURITY_PATH}/guests/${parsed.data.guestId}?error=${code}`);
  }

  revalidateSecurityPaths(parsed.data.guestId);

  if (
    parsed.data.visitType === "overnight_guest" ||
    parsed.data.visitType === "delegate" ||
    parsed.data.visitType === "vip"
  ) {
    redirect(
      `${SECURITY_PATH}/guests/${parsed.data.guestId}?success=gate_entry_recorded&securityEventId=${eventId}`,
    );
  }

  redirect(`${SECURITY_PATH}/gate?success=gate_entry_recorded`);
}

export async function sendGuestToReceptionAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("security.send_to_reception");

  const parsed = sendGuestToReceptionSchema.safeParse({
    securityEventId: getFormString(formData, "securityEventId"),
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(`${SECURITY_PATH}/gate?error=invalid_security_event`);
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("send_guest_to_reception", {
      p_security_event_id: parsed.data.securityEventId,
      p_notes: nullToUndefined(parsed.data.notes),
    })
    .returns<SecurityClearanceEventResult>();

  const eventId = getResultId(data);
  const guestId = getResultGuestId(data);

  if (error || !eventId) {
    const code = mapSecurityError(error?.message ?? "send_to_reception_failed");

    redirect(`${SECURITY_PATH}/gate?error=${code}`);
  }

  revalidateSecurityPaths(guestId);

  redirect(`${SECURITY_PATH}/pending-reception?success=sent_to_reception`);
}

export async function markSecurityGateExitAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("security.record_gate_exit");

  const parsed = markSecurityGateExitSchema.safeParse({
    securityEventId: getFormString(formData, "securityEventId"),
    exitNotes: getFormString(formData, "exitNotes"),
  });

  if (!parsed.success) {
    redirect(`${SECURITY_PATH}/gate?error=invalid_security_event`);
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("mark_security_gate_exit", {
      p_security_event_id: parsed.data.securityEventId,
      p_exit_notes: nullToUndefined(parsed.data.exitNotes),
    })
    .returns<SecurityClearanceEventResult>();

  const eventId = getResultId(data);
  const guestId = getResultGuestId(data);

  if (error || !eventId) {
    const code = mapSecurityError(error?.message ?? "gate_exit_failed");

    redirect(`${SECURITY_PATH}/gate?error=${code}`);
  }

  revalidateSecurityPaths(guestId);

  redirect(`${SECURITY_PATH}/gate?success=gate_exit_recorded`);
}