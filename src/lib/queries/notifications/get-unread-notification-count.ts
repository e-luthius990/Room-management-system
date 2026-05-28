import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const normalizedUserId = userId.trim();

  if (normalizedUserId.length === 0) {
    return 0;
  }

  const supabase = createSupabaseAdminClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      count: "exact",
      head: true,
    })
    .is("archived_at", null)
    .is("read_at", null)
    .or(`recipient_id.eq.${normalizedUserId},user_id.eq.${normalizedUserId}`);

  if (error) {
    console.error("Failed to load unread notification count:", error.message);
    return 0;
  }

  return count ?? 0;
}
