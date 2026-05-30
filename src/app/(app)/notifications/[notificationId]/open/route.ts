import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { markNotificationRead } from "@/lib/queries/notifications/mark-notification-read";

type OpenNotificationRouteProps = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: OpenNotificationRouteProps,
): Promise<never> {
  const currentUser = await requirePermission("notifications.view");
  const { notificationId } = await params;
  const markedNotificationId = await markNotificationRead(
    notificationId,
    currentUser.authUser.id,
  );

  if (!markedNotificationId) {
    redirect("/notifications?error=notification_not_found");
  }

  redirect(`/notifications/${markedNotificationId}`);
}
