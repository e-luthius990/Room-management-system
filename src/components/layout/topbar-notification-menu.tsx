"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type TopbarNotificationItem = {
  id: string;
  title: string;
  body: string;
  severity: string | null;
  read_at: string | null;
  created_at: string;
};

type TopbarNotificationMenuProps = {
  unreadNotificationCount: number;
  notifications: TopbarNotificationItem[];
};

function formatBadgeCount(value: number): string {
  return value > 99 ? "99+" : String(value);
}

function formatNotificationTime(value: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Kampala",
  }).format(date);
}

function getSeverityClass(severity: string | null): string {
  switch (severity) {
    case "urgent":
      return "bg-danger-50 text-danger-700 border-danger-200";

    case "warning":
      return "bg-warning-50 text-warning-700 border-warning-700/25";

    case "success":
      return "bg-success-50 text-success-700 border-success-600/25";

    default:
      return "bg-surface-2 text-muted border-border";
  }
}

export function TopbarNotificationMenu({
  unreadNotificationCount,
  notifications,
}: TopbarNotificationMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasUnread = unreadNotificationCount > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          hasUnread
            ? `${unreadNotificationCount} unread notifications`
            : "Notifications"
        }
        title="Notifications"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "relative inline-flex size-10 shrink-0 items-center justify-center border text-topbar-foreground outline-none transition",
          "rounded-md border-topbar-border bg-white/35 hover:bg-white/55 focus-visible:ring-2 focus-visible:ring-brand-500",
          "dark:bg-white/[0.06] dark:hover:bg-white/[0.1]",
        )}
      >
        <Bell aria-hidden="true" className="size-4" strokeWidth={2} />

        {hasUnread ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full border border-danger-200 bg-danger-50 px-1 text-[10px] font-bold leading-5 text-danger-700 shadow-xs">
            {formatBadgeCount(unreadNotificationCount)}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Latest notifications"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden border border-border bg-surface shadow-floating"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                Notifications
              </p>
              <p className="text-xs text-muted">
                {hasUnread
                  ? `${unreadNotificationCount} unread`
                  : "No unread notifications"}
              </p>
            </div>

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="max-h-[24rem] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={`/notifications?notificationId=${notification.id}`}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="block border-b border-border-subtle px-3 py-3 outline-none transition last:border-b-0 hover:bg-surface-2 focus-visible:bg-surface-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        {!notification.read_at ? (
                          <span
                            aria-hidden="true"
                            className="size-2 shrink-0 rounded-full bg-brand-600"
                          />
                        ) : null}

                        <p className="truncate text-sm font-semibold text-foreground">
                          {notification.title}
                        </p>
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {notification.body}
                      </p>

                      <p className="mt-1 text-[11px] font-medium text-muted">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>

                    {notification.severity ? (
                      <span
                        className={cn(
                          "shrink-0 border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                          getSeverityClass(notification.severity),
                        )}
                      >
                        {notification.severity}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-sm font-semibold text-foreground">
                  No notifications
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Latest alerts will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
