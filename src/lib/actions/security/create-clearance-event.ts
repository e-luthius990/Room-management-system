"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/require-permission";
import { notifyWorkflowPermission } from "@/lib/notifications/workflow-notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createSecurityClearanceEventSchema,
  markSecurityGateExitSchema,
  recordSecurityGateEntrySchema,
  resolveReceptionSecurityHandoffSchema,
  sendGuestToReceptionSchema,
} from "@/lib/validation/security";

const SECURITY_PATH = "/security";
const RECEPTION_HANDOFFS_PATH = "/reception/security-handoffs";

type CreateSecurityClearanceEventResult = string | { id: string };

type SecurityClearanceEventResult =
  | string
  | {
      id: string;
      guest_id?: string | null;
      camp_id?: string | null;
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

function getResultCampId(
  value: SecurityClearanceEventResult | null,
): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    typeof value.camp_id === "string" &&
    value.camp_id.trim().length > 0
  ) {
    return value.camp_id;
  }

  return null;
}

function mapSecurityError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("guest_not_found") ||
    normalized.includes("guest not found")
  ) {
    return "guest_not_found";
  }

  if (
    normalized.includes("security_event_not_found") ||
    normalized.includes("security event not found") ||
    normalized.includes("security handoff not found")
  ) {
    return "security_event_not_found";
  }

  if (
    normalized.includes("guest_already_inside") ||
    normalized.includes("already has an open gate entry") ||
    normalized.includes("open gate entry") ||
    normalized.includes("already inside")
  ) {
    return "guest_already_inside";
  }

  if (
    normalized.includes("guest_already_departed") ||
    normalized.includes("already been marked as left") ||
    normalized.includes("already exited") ||
    normalized.includes("already been marked")
  ) {
    return "guest_already_departed";
  }

  if (
    normalized.includes("guest is not currently inside") ||
    normalized.includes("not currently inside") ||
    normalized.includes("must have an active gate entry") ||
    normalized.includes("active gate entry")
  ) {
    return "guest_not_inside";
  }

  if (
    normalized.includes("already pending reception") ||
    normalized.includes("already pending")
  ) {
    return "already_pending_reception";
  }

  if (
    normalized.includes("already been handled") ||
    normalized.includes("already been resolved")
  ) {
    return "handoff_already_handled";
  }

  if (
    normalized.includes("already been converted") ||
    normalized.includes("converted into another workflow")
  ) {
    return "handoff_already_converted";
  }

  if (
    normalized.includes("invalid reception status") ||
    normalized.includes("invalid reception handoff")
  ) {
    return "invalid_reception_status";
  }

  if (
    normalized.includes("not a reception handoff") ||
    normalized.includes("has not been sent to reception")
  ) {
    return "invalid_reception_handoff";
  }

  if (normalized.includes("can be sent to reception")) {
    return "not_reception_eligible";
  }

  if (
    normalized.includes("invalid_guest_camp") ||
    normalized.includes("invalid guest camp")
  ) {
    return "invalid_guest_camp";
  }

  if (
    normalized.includes("invalid_clearance_status") ||
    normalized.includes("invalid security clearance") ||
    normalized.includes("clearance status")
  ) {
    return "invalid_clearance_status";
  }

  if (
    normalized.includes("invalid_visit_type") ||
    normalized.includes("invalid visit type")
  ) {
    return "invalid_visit_type";
  }

  if (
    normalized.includes("invalid_risk_level") ||
    normalized.includes("risk level")
  ) {
    return "invalid_risk_level";
  }

  if (
    normalized.includes("notes are required") ||
    normalized.includes("security notes are required")
  ) {
    return "security_notes_required";
  }

  if (
    normalized.includes("access_denied") ||
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

  revalidatePath(RECEPTION_HANDOFFS_PATH);
  revalidatePath("/dashboard/reception");
  revalidatePath("/dashboard/camp-manager");

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

  redirect(
    `${SECURITY_PATH}/guests/${parsed.data.guestId}?success=gate_entry_recorded&securityEventId=${eventId}`,
  );
}

export async function sendGuestToReceptionAction(
  formData: FormData,
): Promise<never> {
  const currentUser = await requirePermission("security.send_to_reception");

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
  const campId = getResultCampId(data);

  if (error || !eventId) {
    const code = mapSecurityError(error?.message ?? "send_to_reception_failed");

    redirect(`${SECURITY_PATH}/gate?error=${code}`);
  }

  revalidateSecurityPaths(guestId);

  await notifyWorkflowPermission({
    permission: "reception.handle_security_handoffs",
    campId,
    title: "Security handoff waiting",
    body: "A guest has been sent from security to reception.",
    category: "security",
    severity: "warning",
    actionHref: `${RECEPTION_HANDOFFS_PATH}/${eventId}`,
    entityType: "security_clearance_events",
    entityId: eventId,
    excludeUserIds: [currentUser.authUser.id],
  });

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

export async function resolveReceptionSecurityHandoffAction(
  formData: FormData,
): Promise<never> {
  const currentUser = await requirePermission(
    "reception.handle_security_handoffs",
  );

  const parsed = resolveReceptionSecurityHandoffSchema.safeParse({
    securityEventId: getFormString(formData, "securityEventId"),
    receptionStatus: getFormString(formData, "receptionStatus"),
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(`${RECEPTION_HANDOFFS_PATH}?error=invalid_reception_handoff`);
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("resolve_reception_security_handoff", {
      p_security_event_id: parsed.data.securityEventId,
      p_reception_status: parsed.data.receptionStatus,
      p_notes:
        parsed.data.notes ??
        (parsed.data.receptionStatus === "received"
          ? "Guest received by reception."
          : "Guest was not received by reception."),
    })
    .returns<SecurityClearanceEventResult>();

  const eventId = getResultId(data);
  const guestId = getResultGuestId(data);
  const campId = getResultCampId(data);

  if (error || !eventId) {
    const code = mapSecurityError(
      error?.message ?? "resolve_reception_handoff_failed",
    );

    redirect(
      `${RECEPTION_HANDOFFS_PATH}/${parsed.data.securityEventId}?error=${code}`,
    );
  }

  revalidatePath(`${RECEPTION_HANDOFFS_PATH}/${parsed.data.securityEventId}`);
  revalidateSecurityPaths(guestId);
  revalidatePath("/notifications");

  await notifyWorkflowPermission({
    permission: "security.view_gate_dashboard",
    campId,
    title:
      parsed.data.receptionStatus === "received"
        ? "Guest received by reception"
        : "Guest not received by reception",
    body:
      parsed.data.receptionStatus === "received"
        ? "Reception received the guest from security."
        : "Reception marked the security handoff as not received.",
    category: "security",
    severity:
      parsed.data.receptionStatus === "received" ? "success" : "warning",
    actionHref: guestId ? `${SECURITY_PATH}/guests/${guestId}` : SECURITY_PATH,
    entityType: "security_clearance_events",
    entityId: eventId,
    excludeUserIds: [currentUser.authUser.id],
  });

  redirect(
    `${RECEPTION_HANDOFFS_PATH}?success=${
      parsed.data.receptionStatus === "received"
        ? "guest_received"
        : "guest_not_received"
    }`,
  );
}
