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
  await requirePermission("notifications.view");

  const [query, notifications] = await Promise.all([
    searchParams,
    getNotifications(),
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
                <button
                  type="submit"
                  className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                >
                  Mark all read
                </button>
              </form>
            ) : null}

            <Link
              href="/notifications/new"
              className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              New alert
            </Link>
          </div>
        }
      />

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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

      <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Alert</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Camp</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Read</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-100">
            {notifications.map((notification) => (
              <tr
                key={notification.id}
                className={[
                  "align-top",
                  notification.read_at ? "" : "bg-amber-50/35",
                ].join(" ")}
              >
                <td className="px-4 py-4">
                  <div className="font-medium text-neutral-950">
                    {notification.title}
                  </div>

                  <div className="mt-1 max-w-[340px] truncate text-xs text-neutral-500">
                    {notification.body}
                  </div>
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  {notification.recipient_name ?? "Camp broadcast"}
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  {notification.camp_name ?? "—"}
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  {formatNotificationCategory(notification.category)}
                </td>

                <td className="px-4 py-4">
                  <span
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      notificationSeverityTone(notification.severity),
                    ].join(" ")}
                  >
                    {formatNotificationSeverity(notification.severity)}
                  </span>
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  {formatDateTime(notification.created_at)}
                </td>

                <td className="px-4 py-4 text-neutral-700">
                  {notification.read_at
                    ? formatDateTime(notification.read_at)
                    : "Unread"}
                </td>

                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/notifications/${notification.id}`}
                    className="rounded-2xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50"
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
                  className="px-4 py-10 text-center text-sm text-neutral-500"
                >
                  No notifications found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  className = "border-neutral-200 bg-white text-neutral-950",
  labelClassName = "text-neutral-500",
}: {
  title: string;
  value: number;
  className?: string;
  labelClassName?: string;
}): React.JSX.Element {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${className}`}>
      <div className="text-2xl font-semibold">{value}</div>

      <div
        className={`mt-1 text-xs font-medium uppercase tracking-wide ${labelClassName}`}
      >
        {title}
      </div>
    </div>
  );
}
