import { requirePermission } from "@/lib/auth/require-permission";
import {
  getNotificationCampOptions,
  getNotificationRecipientOptions,
} from "@/lib/queries/notifications/options";
import { CreateNotificationForm } from "@/components/notifications/create-notification-form";

type NewNotificationPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input:
      "Check the form and select at least one target: a recipient or a camp.",
    recipient_not_found: "Selected recipient was not found.",
    camp_not_found: "Selected camp was not found.",
    invalid_category: "Selected notification category is invalid.",
    invalid_severity: "Selected notification severity is invalid.",
    invalid_action_href:
      "Action path must be an internal path starting with /.",
    access_denied: "You do not have access to create this notification.",
    create_failed: "Notification could not be created.",
  };

  return messages[error] ?? "Notification could not be created.";
}

export default async function NewNotificationPage({
  searchParams,
}: NewNotificationPageProps): Promise<React.JSX.Element> {
  await requirePermission("notifications.create");

  const [query, recipients, camps] = await Promise.all([
    searchParams,
    getNotificationRecipientOptions(),
    getNotificationCampOptions(),
  ]);

  const errorMessage = getErrorMessage(query?.error);
  const hasAnyTarget = recipients.length > 0 || camps.length > 0;

  return (
    <div>
      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!hasAnyTarget ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-800">
          At least one active user or active camp is required before sending
          notifications.
        </div>
      ) : (
        <CreateNotificationForm recipients={recipients} camps={camps} />
      )}
    </div>
  );
}
