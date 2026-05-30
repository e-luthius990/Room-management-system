import "server-only";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notificationIdSchema } from "@/lib/validation/notifications";

const NOTIFICATIONS_PATH = "/notifications";

type NotificationOwnershipRow = {
  id: string;
  read_at: string | null;
};

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<string | null> {
  const parsed = notificationIdSchema.safeParse({ notificationId });

  if (!parsed.success) {
    return null;
  }

  const normalizedUserId = userId.trim();

  if (normalizedUserId.length === 0) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  const { data: notification, error: findError } = await supabase
    .from("notifications")
    .select("id,read_at")
    .eq("id", parsed.data.notificationId)
    .is("archived_at", null)
    .or(`recipient_id.eq.${normalizedUserId},user_id.eq.${normalizedUserId}`)
    .returns<NotificationOwnershipRow[]>()
    .maybeSingle();

  if (findError || !notification) {
    return null;
  }

  if (!notification.read_at) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({
        read_at: new Date().toISOString(),
        status: "read",
      })
      .eq("id", notification.id)
      .is("read_at", null);

    if (updateError) {
      return null;
    }
  }

  revalidatePath(NOTIFICATIONS_PATH);
  revalidatePath(`${NOTIFICATIONS_PATH}/${notification.id}`);

  return notification.id;
}
