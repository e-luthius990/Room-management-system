import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getNotifications } from "@/lib/queries/notifications/get-notifications";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications/notification-workflow";
import {
  formatNotificationCategory,
  formatNotificationSeverity,
  notificationSeverityTone,
} from "@/components/notifications/status";

type NotificationsSearchParams = {
  error?: string;
  success?: string;
};

type NotificationsPageProps = {
  searchParams?: Promise<NotificationsSearchParams>;
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

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
    invalid_action_href:
      "Action path must be an internal path starting with /.",
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
    <div>
      <PageHeader
        title="Notifications"
        description="Internal operational alerts, workflow messages, and event-linked inbox items."
        actions={
          <div className="flex flex-wrap gap-3">
            {unreadCount > 0 ? (
              <form action={markAllNotificationsReadAction}>
                <button type="submit" className="btn-secondary">
                  Mark all read
                </button>
              </form>
            ) : null}

            <Link href="/notifications/new" className="btn-primary">
              New alert
            </Link>
          </div>
        }
      />

      {errorMessage ? (
        <div className="mb-6 border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 border border-success-600/25 bg-success-50 px-4 py-3 text-sm text-success-700">
          {successMessage}
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard title="Total" value={notifications.length} />

        <SummaryCard
          title="Unread"
          value={unreadCount}
          className="border-amber-200 bg-amber-50 text-amber-800"
          labelClassName="text-amber-700"
        />

        <SummaryCard
          title="Urgent"
          value={urgentCount}
          className="border-red-200 bg-red-50 text-red-800"
          labelClassName="text-red-700"
        />
      </section>

      <div className="table-shell">
        <div className="table-scroll">
          <table className="data-table min-w-[1100px]">
            <thead>
              <tr>
                <th>Alert</th>
                <th>Recipient</th>
                <th>Camp</th>
                <th>Category</th>
                <th>Severity</th>
                <th>Created</th>
                <th>Read</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {notifications.map((notification) => (
                <tr
                  key={notification.id}
                  className={[
                    "align-top",
                    notification.read_at ? "" : "bg-amber-50/35",
                  ].join(" ")}
                >
                  <td>
                    <div className="font-medium text-foreground">
                      {notification.title}
                    </div>

                    <div className="mt-1 max-w-[340px] truncate text-xs text-muted">
                      {notification.body}
                    </div>
                  </td>

                  <td className="text-foreground">
                    {notification.recipient_name ?? "Camp broadcast"}
                  </td>

                  <td className="text-foreground">
                    {notification.camp_name ?? "—"}
                  </td>

                  <td className="text-foreground">
                    {formatNotificationCategory(notification.category)}
                  </td>

                  <td>
                    <span
                      className={[
                        "border px-2.5 py-1 text-xs font-medium",
                        notificationSeverityTone(notification.severity),
                      ].join(" ")}
                    >
                      {formatNotificationSeverity(notification.severity)}
                    </span>
                  </td>

                  <td className="text-foreground">
                    {formatDateTime(notification.created_at)}
                  </td>

                  <td className="text-foreground">
                    {notification.read_at
                      ? formatDateTime(notification.read_at)
                      : "Unread"}
                  </td>

                  <td className="text-right">
                    <Link
                      href={`/notifications/${notification.id}`}
                      className="btn-secondary btn-sm"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}

              {notifications.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-muted"
                  >
                    No notifications found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  className = "border-border bg-surface text-foreground",
  labelClassName = "text-muted",
}: {
  title: string;
  value: number;
  className?: string;
  labelClassName?: string;
}): React.JSX.Element {
  return (
    <div className={`surface-card p-4 ${className}`}>
      <div className="text-2xl font-semibold">{value}</div>

      <div
        className={`mt-1 text-xs font-medium uppercase tracking-wide ${labelClassName}`}
      >
        {title}
      </div>
    </div>
  );
}
