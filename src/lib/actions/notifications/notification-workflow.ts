"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notificationIdSchema } from "@/lib/validation/notifications";

const NOTIFICATIONS_PATH = "/notifications";

type NotificationWorkflowRpcResult = string | { id: string };

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getRpcNotificationId(
  value: NotificationWorkflowRpcResult | null,
): string | null {
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

function mapNotificationError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("not found")) {
    return "notification_not_found";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  return "workflow_failed";
}

export async function markNotificationReadAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("notifications.mark_read");

  const fallbackNotificationId = getFormString(formData, "notificationId");

  const parsed = notificationIdSchema.safeParse({
    notificationId: fallbackNotificationId,
  });

  if (!parsed.success) {
    redirect(
      fallbackNotificationId
        ? `${NOTIFICATIONS_PATH}/${fallbackNotificationId}?error=invalid_input`
        : `${NOTIFICATIONS_PATH}?error=invalid_input`,
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("mark_notification_read", {
      p_notification_id: parsed.data.notificationId,
    })
    .returns<NotificationWorkflowRpcResult>();

  const notificationId = getRpcNotificationId(data);

  if (error || !notificationId) {
    const code = mapNotificationError(error?.message ?? "workflow_failed");

    redirect(`${NOTIFICATIONS_PATH}/${parsed.data.notificationId}?error=${code}`);
  }

  revalidatePath(NOTIFICATIONS_PATH);
  revalidatePath(`${NOTIFICATIONS_PATH}/${notificationId}`);

  redirect(`${NOTIFICATIONS_PATH}/${notificationId}?success=marked_read`);
}

export async function markAllNotificationsReadAction(): Promise<never> {
  await requirePermission("notifications.mark_read");

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    redirect(`${NOTIFICATIONS_PATH}?error=${mapNotificationError(error.message)}`);
  }

  revalidatePath(NOTIFICATIONS_PATH);

  redirect(`${NOTIFICATIONS_PATH}?success=all_marked_read`);
}

export async function archiveNotificationAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("notifications.archive");

  const fallbackNotificationId = getFormString(formData, "notificationId");

  const parsed = notificationIdSchema.safeParse({
    notificationId: fallbackNotificationId,
  });

  if (!parsed.success) {
    redirect(
      fallbackNotificationId
        ? `${NOTIFICATIONS_PATH}/${fallbackNotificationId}?error=invalid_input`
        : `${NOTIFICATIONS_PATH}?error=invalid_input`,
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("archive_notification", {
      p_notification_id: parsed.data.notificationId,
    })
    .returns<NotificationWorkflowRpcResult>();

  const notificationId = getRpcNotificationId(data);

  if (error || !notificationId) {
    const code = mapNotificationError(error?.message ?? "workflow_failed");

    redirect(`${NOTIFICATIONS_PATH}/${parsed.data.notificationId}?error=${code}`);
  }

  revalidatePath(NOTIFICATIONS_PATH);
  revalidatePath(`${NOTIFICATIONS_PATH}/${notificationId}`);

  redirect(`${NOTIFICATIONS_PATH}?success=notification_archived`);
}