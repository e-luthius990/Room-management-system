"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { NotificationListItem } from "@/lib/queries/notifications/get-notifications";
import {
  formatNotificationCategory,
  formatNotificationSeverity,
  notificationSeverityTone,
} from "@/components/notifications/status";

type NotificationsInboxProps = {
  notifications: NotificationListItem[];
  initialSelectedNotificationId?: string | null;
};

type ReadResponse = {
  ok: boolean;
  notificationId?: string;
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm font-semibold leading-6 text-foreground">
        {value}
      </dd>
    </div>
  );
}

export function NotificationsInbox({
  notifications,
  initialSelectedNotificationId = null,
}: NotificationsInboxProps): React.JSX.Element {
  const router = useRouter();
  const titleId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedNotificationId,
  );
  const [readAtById, setReadAtById] = useState<Record<string, string>>({});
  const [readError, setReadError] = useState<string | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();

  const items = useMemo(() => {
    return notifications.map((notification) => {
      const localReadAt = readAtById[notification.id];

      if (!localReadAt || notification.read_at) {
        return notification;
      }

      return {
        ...notification,
        read_at: localReadAt,
        status: "read" as const,
      };
    });
  }, [notifications, readAtById]);

  const selectedNotification = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    return items.find((notification) => notification.id === selectedId) ?? null;
  }, [items, selectedId]);

  useEffect(() => {
    if (!selectedNotification || selectedNotification.read_at) {
      return;
    }

    let cancelled = false;
    const notificationId = selectedNotification.id;

    async function markRead(): Promise<void> {
      try {
        const response = await fetch(`/notifications/${notificationId}/read`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Read update failed.");
        }

        const result = (await response.json()) as ReadResponse;

        if (!result.ok || !result.notificationId || cancelled) {
          return;
        }

        const readAt = new Date().toISOString();

        setReadAtById((currentReadAtById) => ({
          ...currentReadAtById,
          [result.notificationId as string]:
            currentReadAtById[result.notificationId as string] ?? readAt,
        }));

        startRefreshTransition(() => {
          router.refresh();
        });
      } catch {
        if (!cancelled) {
          setReadError("This notification could not be marked as read.");
        }
      }
    }

    void markRead();

    return () => {
      cancelled = true;
    };
  }, [router, selectedNotification]);

  useEffect(() => {
    if (!selectedNotification) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedNotification]);

  function openNotification(notification: NotificationListItem): void {
    setReadError(null);
    setSelectedId(notification.id);
  }

  const hasLinkedEntity =
    Boolean(selectedNotification?.entity_type) ||
    Boolean(selectedNotification?.entity_id);

  return (
    <>
      <section className="overflow-hidden border border-border bg-surface">
        <div className="border-b border-border bg-surface px-4 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Inbox
              </p>
              <p className="text-sm font-semibold text-foreground">
                Latest operational alerts
              </p>
            </div>

            <p className="text-xs text-muted">{items.length} items</p>
          </div>
        </div>

        <div className="divide-y divide-border-subtle">
          {items.map((notification) => {
            const isUnread = !notification.read_at;

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => openNotification(notification)}
                className={[
                  "grid w-full gap-3 px-4 py-4 text-left outline-none transition lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start",
                  "hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500",
                  isUnread ? "bg-warning-50/40" : "bg-surface",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isUnread ? (
                      <span
                        aria-hidden="true"
                        className="size-2 rounded-full bg-brand-600"
                      />
                    ) : null}

                    <h2 className="min-w-0 truncate text-sm font-semibold text-foreground">
                      {notification.title}
                    </h2>

                    <span
                      className={[
                        "border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]",
                        notificationSeverityTone(notification.severity),
                      ].join(" ")}
                    >
                      {formatNotificationSeverity(notification.severity)}
                    </span>
                  </div>

                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                    {notification.body}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-muted">
                    <span>
                      {formatNotificationCategory(notification.category)}
                    </span>
                    <span>{notification.camp_name ?? "No camp"}</span>
                    <span>{formatDateTime(notification.created_at)}</span>
                    <span>
                      {notification.read_at
                        ? `Read ${formatDateTime(notification.read_at)}`
                        : "Unread"}
                    </span>
                  </div>
                </div>

                <div className="grid gap-1 text-xs leading-5 text-muted lg:text-right">
                  <span className="font-semibold text-foreground">
                    {notification.recipient_name ?? "Camp broadcast"}
                  </span>
                  <span>Click to read</span>
                </div>
              </button>
            );
          })}

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-semibold text-foreground">
                No notifications found.
              </p>
              <p className="mt-1 text-sm text-muted">
                New operational alerts will appear here.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {selectedNotification ? (
        <div
          className="modal-backdrop flex items-center justify-center px-3 py-4 sm:px-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedId(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto border border-border bg-surface shadow-floating"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  {formatNotificationCategory(selectedNotification.category)}
                </p>

                <h2
                  id={titleId}
                  className="mt-1 truncate text-base font-semibold text-foreground"
                >
                  {selectedNotification.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="inline-flex size-9 shrink-0 items-center justify-center border border-border bg-surface-2 text-muted transition hover:bg-surface-3 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Close notification"
              >
                <X aria-hidden="true" className="size-4" strokeWidth={2} />
              </button>
            </div>

            {readError ? (
              <div className="mx-4 mt-4 alert alert-danger">{readError}</div>
            ) : null}

            <div className="px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]",
                    notificationSeverityTone(selectedNotification.severity),
                  ].join(" ")}
                >
                  {formatNotificationSeverity(selectedNotification.severity)}
                </span>

                {isRefreshing ? (
                  <span className="text-xs font-semibold text-muted">
                    Updating
                  </span>
                ) : null}
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-foreground-soft">
                {selectedNotification.body}
              </p>
            </div>

            <dl className="divide-y divide-border border-t border-border px-4">
              <InfoRow
                label="Recipient"
                value={selectedNotification.recipient_name ?? "Camp broadcast"}
              />

              <InfoRow
                label="Camp"
                value={selectedNotification.camp_name ?? "-"}
              />

              <InfoRow
                label="Created"
                value={formatDateTime(selectedNotification.created_at)}
              />

              <InfoRow
                label="Read"
                value={
                  selectedNotification.read_at
                    ? formatDateTime(selectedNotification.read_at)
                    : "Unread"
                }
              />

              {hasLinkedEntity ? (
                <InfoRow
                  label="Workflow"
                  value={
                    <span className="break-all">
                      {formatLinkedEntity(
                        selectedNotification.entity_type,
                        selectedNotification.entity_id,
                      )}
                    </span>
                  }
                />
              ) : null}
            </dl>
          </section>
        </div>
      ) : null}
    </>
  );
}
