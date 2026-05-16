import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getNotificationDetail } from "@/lib/queries/notifications/get-notification-detail";
import { NotificationActions } from "@/components/notifications/notification-actions";
import {
  formatNotificationCategory,
  formatNotificationSeverity,
  notificationSeverityTone,
} from "@/components/notifications/status";

type NotificationDetailSearchParams = {
  error?: string;
  success?: string;
};

type NotificationDetailPageProps = {
  params: Promise<{
    notificationId: string;
  }>;
  searchParams?: Promise<NotificationDetailSearchParams>;
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

function formatLinkedEntity(
  entityType: string | null,
  entityId: string | null,
): string {
  if (!entityType) {
    return "—";
  }

  const label = entityType
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return entityId ? `${label} · ${entityId}` : label;
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
  };

  return messages[error] ?? "Notification action could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (!success) {
    return null;
  }

  const messages: Record<string, string> = {
    notification_created: "Notification created successfully.",
    marked_read: "Notification marked as read.",
    notification_archived: "Notification archived successfully.",
  };

  return messages[success] ?? null;
}

export default async function NotificationDetailPage({
  params,
  searchParams,
}: NotificationDetailPageProps): Promise<React.JSX.Element> {
  await requirePermission("notifications.view");

  const [{ notificationId }, query] = await Promise.all([params, searchParams]);

  const notification = await getNotificationDetail(notificationId);

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  return (
    <div>
      <PageHeader
        title={notification.title}
        description="Notification detail, linked workflow context, read status, and archive controls."
        actions={
          <Link
            href="/notifications"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Back to notifications
          </Link>
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

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-neutral-950">
                Alert details
              </h2>

              <p className="mt-1 text-sm leading-6 text-neutral-500">
                Message target, severity, linked record, and delivery context.
              </p>
            </div>

            <span
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium",
                notificationSeverityTone(notification.severity),
              ].join(" ")}
            >
              {formatNotificationSeverity(notification.severity)}
            </span>
          </div>

          <dl className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <dt className="text-sm text-neutral-500">Recipient</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {notification.recipient_name ?? "Camp broadcast"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Camp</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {notification.camp_name ?? "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Category</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {formatNotificationCategory(notification.category)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Severity</dt>
              <dd className="mt-1">
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    notificationSeverityTone(notification.severity),
                  ].join(" ")}
                >
                  {formatNotificationSeverity(notification.severity)}
                </span>
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Created</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {formatDateTime(notification.created_at)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Read</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {notification.read_at
                  ? formatDateTime(notification.read_at)
                  : "Unread"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Created by</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {notification.created_by_name ?? "System"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Linked entity</dt>
              <dd className="mt-1 break-all font-medium text-neutral-950">
                {formatLinkedEntity(
                  notification.entity_type,
                  notification.entity_id,
                )}
              </dd>
            </div>

            <div className="md:col-span-2">
              <dt className="text-sm text-neutral-500">Message</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-800">
                {notification.body}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-950">
              Notification actions
            </h2>

            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Mark this notification as read, open the linked record, or archive
              it.
            </p>

            <div className="mt-5">
              <NotificationActions
                notificationId={notification.id}
                readAt={notification.read_at}
                actionHref={notification.action_href}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
