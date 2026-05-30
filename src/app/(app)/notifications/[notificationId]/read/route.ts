import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { markNotificationRead } from "@/lib/queries/notifications/mark-notification-read";
import { isSameOriginRequest } from "@/lib/security/request-origin";

type ReadNotificationRouteProps = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function POST(
  request: Request,
  { params }: ReadNotificationRouteProps,
): Promise<NextResponse<{ ok: boolean; notificationId?: string }>> {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const currentUser = await requirePermission("notifications.view");
  const { notificationId } = await params;
  const markedNotificationId = await markNotificationRead(
    notificationId,
    currentUser.authUser.id,
  );

  if (!markedNotificationId) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    notificationId: markedNotificationId,
  });
}
