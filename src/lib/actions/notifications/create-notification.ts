"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createNotificationSchema } from "@/lib/validation/notifications";

const NOTIFICATIONS_PATH = "/notifications";
const NEW_NOTIFICATION_PATH = "/notifications/new";

type CreateNotificationRpcResult = string | { id: string };

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getNotificationId(
  value: CreateNotificationRpcResult | null,
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

function mapCreateNotificationError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("recipient") || normalized.includes("profile")) {
    return "recipient_not_found";
  }

  if (normalized.includes("camp")) {
    return "camp_not_found";
  }

  if (normalized.includes("category")) {
    return "invalid_category";
  }

  if (normalized.includes("severity")) {
    return "invalid_severity";
  }

  if (normalized.includes("href") || normalized.includes("action")) {
    return "invalid_action_href";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  return "create_failed";
}

export async function createNotificationAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("notifications.create");

  const parsed = createNotificationSchema.safeParse({
    recipientId: getFormString(formData, "recipientId"),
    campId: getFormString(formData, "campId"),
    title: getFormString(formData, "title"),
    body: getFormString(formData, "body"),
    category: getFormString(formData, "category"),
    severity: getFormString(formData, "severity"),
    entityType: getFormString(formData, "entityType"),
    entityId: getFormString(formData, "entityId"),
    actionHref: getFormString(formData, "actionHref"),
  });

  if (!parsed.success) {
    redirect(`${NEW_NOTIFICATION_PATH}?error=invalid_input`);
  }

  const supabase = await createServerSupabaseClient();

  /*
   * create_internal_notification has required DB parameters, so generated
   * Supabase types may expect string values even when the DB function accepts
   * nullable uuid/text values at runtime.
   */
  const { data, error } = await supabase
    .rpc("create_internal_notification", {
      p_recipient_id: parsed.data.recipientId as unknown as string,
      p_camp_id: parsed.data.campId as unknown as string,
      p_title: parsed.data.title,
      p_body: parsed.data.body,
      p_category: parsed.data.category,
      p_severity: parsed.data.severity,
      p_entity_type: parsed.data.entityType as unknown as string,
      p_entity_id: parsed.data.entityId as unknown as string,
      p_action_href: parsed.data.actionHref as unknown as string,
    })
    .returns<CreateNotificationRpcResult>();

  const notificationId = getNotificationId(data);

  if (error || !notificationId) {
    const code = mapCreateNotificationError(error?.message ?? "create_failed");

    redirect(`${NEW_NOTIFICATION_PATH}?error=${code}`);
  }

  revalidatePath(NOTIFICATIONS_PATH);
  revalidatePath(NEW_NOTIFICATION_PATH);

  redirect(`${NOTIFICATIONS_PATH}/${notificationId}?success=notification_created`);
}