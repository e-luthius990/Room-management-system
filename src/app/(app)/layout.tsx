import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";
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
  const unreadNotificationCount = canViewNotifications
    ? await getUnreadNotificationCount(currentUser.authUser.id)
    : 0;

  return (
    <AppShell
      currentUser={currentUser}
      unreadNotificationCount={unreadNotificationCount}
    >
      {children}
    </AppShell>
  );
}
