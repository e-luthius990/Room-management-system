import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { getNotifications } from "@/lib/queries/notifications/get-notifications";
import { getUnreadNotificationCount } from "@/lib/queries/notifications/get-unread-notification-count";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({
  children,
}: AppLayoutProps): Promise<React.JSX.Element> {
  const currentUser = await requireAuth();
  const canViewNotifications = currentUser.permissions.includes(
    "notifications.view",
  );
  const [unreadNotificationCount, notifications] = canViewNotifications
    ? await Promise.all([
        getUnreadNotificationCount(currentUser.authUser.id),
        getNotifications(currentUser.authUser.id, 5),
      ])
    : [0, []];

  return (
    <AppShell
      currentUser={currentUser}
      unreadNotificationCount={unreadNotificationCount}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
