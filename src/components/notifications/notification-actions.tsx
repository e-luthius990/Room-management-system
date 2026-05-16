import Link from "next/link";
import {
  archiveNotificationAction,
  markNotificationReadAction,
} from "@/lib/actions/notifications/notification-workflow";

type NotificationActionsProps = {
  notificationId: string;
  readAt: string | null;
  actionHref: string | null;
};

function isSafeInternalHref(value: string | null): value is string {
  if (!value) {
    return false;
  }

  return value.startsWith("/") && !value.startsWith("//");
}

export function NotificationActions({
  notificationId,
  readAt,
  actionHref,
}: NotificationActionsProps): React.JSX.Element {
  const safeActionHref = isSafeInternalHref(actionHref) ? actionHref : null;

  return (
    <div className="space-y-4">
      {safeActionHref ? (
        <Link
          href={safeActionHref}
          className="block rounded-2xl bg-neutral-950 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Open linked record
        </Link>
      ) : null}

      {!readAt ? (
        <form action={markNotificationReadAction}>
          <input type="hidden" name="notificationId" value={notificationId} />

          <button
            type="submit"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Mark as read
          </button>
        </form>
      ) : null}

      <form action={archiveNotificationAction}>
        <input type="hidden" name="notificationId" value={notificationId} />

        <button
          type="submit"
          className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          Archive notification
        </button>
      </form>
    </div>
  );
}
