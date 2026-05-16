import type {
  NotificationCampOption,
  NotificationRecipientOption,
} from "@/lib/queries/notifications/options";
import { createNotificationAction } from "@/lib/actions/notifications/create-notification";
import {
  notificationCategoryOptions,
  notificationSeverityOptions,
} from "@/lib/validation/notifications";

type CreateNotificationFormProps = {
  recipients: NotificationRecipientOption[];
  camps: NotificationCampOption[];
};

export function CreateNotificationForm({
  recipients,
  camps,
}: CreateNotificationFormProps): React.JSX.Element {
  return (
    <form
      action={createNotificationAction}
      className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label
            htmlFor="notification-recipient-id"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Recipient
          </label>

          <select
            id="notification-recipient-id"
            name="recipientId"
            defaultValue=""
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            <option value="">No individual recipient</option>

            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.full_name}
                {recipient.role_name ? ` · ${recipient.role_name}` : ""}
                {recipient.email ? ` · ${recipient.email}` : ""}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Select a recipient for a direct notification, or leave blank when
            sending to a camp.
          </p>
        </div>

        <div>
          <label
            htmlFor="notification-camp-id"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Camp
          </label>

          <select
            id="notification-camp-id"
            name="campId"
            defaultValue=""
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            <option value="">No camp broadcast</option>

            {camps.map((camp) => (
              <option key={camp.id} value={camp.id}>
                {camp.name} ({camp.code})
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Select a camp to notify users who can view that camp.
          </p>
        </div>

        <div>
          <label
            htmlFor="notification-category"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Category
          </label>

          <select
            id="notification-category"
            required
            name="category"
            defaultValue="general"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            {notificationCategoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="notification-severity"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Severity
          </label>

          <select
            id="notification-severity"
            required
            name="severity"
            defaultValue="info"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            {notificationSeverityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="notification-title"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Title
          </label>

          <input
            id="notification-title"
            required
            name="title"
            minLength={2}
            maxLength={160}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Short alert title"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="notification-body"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Message
          </label>

          <textarea
            id="notification-body"
            required
            name="body"
            rows={5}
            minLength={2}
            maxLength={1000}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Internal operational alert message"
          />
        </div>

        <div>
          <label
            htmlFor="notification-entity-type"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Linked entity type
          </label>

          <input
            id="notification-entity-type"
            name="entityType"
            maxLength={120}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="guest, room, stay, ticket..."
          />
        </div>

        <div>
          <label
            htmlFor="notification-entity-id"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Linked entity ID
          </label>

          <input
            id="notification-entity-id"
            name="entityId"
            inputMode="text"
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Optional UUID"
          />
        </div>

        <div className="md:col-span-2">
          <label
            htmlFor="notification-action-href"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Action path
          </label>

          <input
            id="notification-action-href"
            name="actionHref"
            maxLength={300}
            pattern="/.*"
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="/maintenance/tickets/..."
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Optional internal path. When provided, it must start with /.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        Select at least one target: an individual recipient or a camp broadcast.
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Send notification
        </button>
      </div>
    </form>
  );
}
