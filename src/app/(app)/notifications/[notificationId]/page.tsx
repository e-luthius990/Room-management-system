import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getNotificationDetail } from "@/lib/queries/notifications/get-notification-detail";
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
    return "-";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
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
    return "-";
  }

  const label = entityType
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return entityId ? `${label} / ${entityId}` : label;
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm font-semibold leading-6 text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default async function NotificationDetailPage({
  params,
  searchParams,
}: NotificationDetailPageProps): Promise<React.JSX.Element> {
  const currentUser = await requirePermission("notifications.view");

  const [{ notificationId }, query] = await Promise.all([params, searchParams]);

  const notification = await getNotificationDetail(
    notificationId,
    currentUser.authUser.id,
  );

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);
  const hasLinkedEntity =
    Boolean(notification.entity_type) || Boolean(notification.entity_id);

  return (
    <div className="page-stack">
      <PageHeader
        title={notification.title}
        description="Notification message and delivery context."
        actions={
          <Link href="/notifications" className="btn-secondary">
            Back to notifications
          </Link>
        }
      />

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      <section className="border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Details
              </h2>

              <p className="mt-1 text-xs leading-5 text-muted">
                {formatNotificationCategory(notification.category)}
              </p>
            </div>

            <span
              className={[
                "border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]",
                notificationSeverityTone(notification.severity),
              ].join(" ")}
            >
              {formatNotificationSeverity(notification.severity)}
            </span>
          </div>
        </div>

        <dl className="divide-y divide-border px-4">
          <InfoRow
            label="Recipient"
            value={notification.recipient_name ?? "Camp broadcast"}
          />

          <InfoRow label="Camp" value={notification.camp_name ?? "-"} />

          <InfoRow
            label="Category"
            value={formatNotificationCategory(notification.category)}
          />

          <InfoRow
            label="Created"
            value={formatDateTime(notification.created_at)}
          />

          <InfoRow
            label="Read"
            value={
              notification.read_at
                ? formatDateTime(notification.read_at)
                : "Unread"
            }
          />

          <InfoRow
            label="Created by"
            value={notification.created_by_name ?? "System"}
          />

          {hasLinkedEntity ? (
            <InfoRow
              label="Workflow"
              value={
                <span className="break-all">
                  {formatLinkedEntity(
                    notification.entity_type,
                    notification.entity_id,
                  )}
                </span>
              }
            />
          ) : null}

          <InfoRow
            label="Message"
            value={
              <span className="whitespace-pre-wrap text-foreground-soft">
                {notification.body}
              </span>
            }
          />
        </dl>
      </section>
    </div>
  );
}
