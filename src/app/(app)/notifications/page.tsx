import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationsInbox } from "@/components/notifications/notifications-inbox";
import { getNotifications } from "@/lib/queries/notifications/get-notifications";

type NotificationsSearchParams = {
  error?: string;
  notificationId?: string;
  success?: string;
};

type NotificationsPageProps = {
  searchParams?: Promise<NotificationsSearchParams>;
};

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the action and try again.",
    notification_not_found: "Notification not found.",
    access_denied: "You do not have access to perform this action.",
    workflow_failed: "Notification action failed.",
    create_failed: "Notification could not be created.",
    recipient_not_found: "Selected recipient was not found.",
    camp_not_found: "Selected camp was not found.",
    invalid_category: "Selected notification category is invalid.",
    invalid_severity: "Selected notification severity is invalid.",
    invalid_action_href: "Action path must be an internal path starting with /.",
  };

  return messages[error] ?? "Notification action could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (!success) {
    return null;
  }

  const messages: Record<string, string> = {
    all_marked_read: "All notifications marked as read.",
    notification_archived: "Notification archived.",
    marked_read: "Notification marked as read.",
    notification_created: "Notification created successfully.",
  };

  return messages[success] ?? null;
}

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps): Promise<React.JSX.Element> {
  const currentUser = await requirePermission("notifications.view");

  const [query, notifications] = await Promise.all([
    searchParams,
    getNotifications(currentUser.authUser.id),
  ]);

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at,
  ).length;

  const urgentCount = notifications.filter(
    (notification) => notification.severity === "urgent",
  ).length;

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  return (
    <div className="page-stack">
      <PageHeader
        title="Notifications"
        description="Operational alerts and workflow messages."
      />

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard title="Total" value={notifications.length} />
        <SummaryCard title="Unread" value={unreadCount} tone="warning" />
        <SummaryCard title="Urgent" value={urgentCount} tone="danger" />
      </section>

      <NotificationsInbox
        notifications={notifications}
        initialSelectedNotificationId={query?.notificationId}
      />
    </div>
  );
}

function SummaryCard({
  title,
  value,
  tone = "default",
}: {
  title: string;
  value: number;
  tone?: "default" | "warning" | "danger";
}): React.JSX.Element {
  const classes = {
    default: "border-border bg-surface text-foreground",
    warning: "border-warning-700/25 bg-warning-50 text-warning-700",
    danger: "border-danger-600/25 bg-danger-50 text-danger-700",
  }[tone];

  return (
    <div className={`border px-3 py-2.5 ${classes}`}>
      <div className="text-2xl font-semibold">{value}</div>

      <div className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {title}
      </div>
    </div>
  );
}
