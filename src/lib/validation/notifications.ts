import { z } from "zod";

export const NOTIFICATION_CATEGORY_VALUES = [
  "general",
  "reservation",
  "stay",
  "housekeeping",
  "maintenance",
  "room_service",
  "security",
  "guest_documents",
  "keys",
  "system",
] as const;

export const NOTIFICATION_SEVERITY_VALUES = [
  "info",
  "success",
  "warning",
  "urgent",
] as const;

export const NOTIFICATION_STATUS_VALUES = [
  "unread",
  "read",
  "archived",
] as const;

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORY_VALUES)[number];

export type NotificationSeverity =
  (typeof NOTIFICATION_SEVERITY_VALUES)[number];

export type NotificationStatus =
  (typeof NOTIFICATION_STATUS_VALUES)[number];

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeLowerText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

const requiredUuid = (message: string) =>
  z.preprocess(normalizeRequiredText, z.string().uuid(message));

const optionalUuid = z.preprocess(
  normalizeOptionalText,
  z.string().uuid("Invalid linked record.").nullable(),
);

const optionalEntityType = z.preprocess(
  normalizeOptionalText,
  z.string().max(120, "Linked record type is too long.").nullable(),
);

const optionalActionHref = z
  .preprocess(
    normalizeOptionalText,
    z.string().max(300, "Action path is too long.").nullable(),
  )
  .refine(
    (value) => {
      if (value === null) {
        return true;
      }

      return value.startsWith("/");
    },
    {
      message: "Action path must start with /.",
    },
  );

export const notificationCategorySchema = z.preprocess(
  normalizeLowerText,
  z.enum(NOTIFICATION_CATEGORY_VALUES),
);

export const notificationSeveritySchema = z.preprocess(
  normalizeLowerText,
  z.enum(NOTIFICATION_SEVERITY_VALUES),
);

export const notificationStatusSchema = z.preprocess(
  normalizeLowerText,
  z.enum(NOTIFICATION_STATUS_VALUES),
);

export const notificationCategoryLabels: Record<
  NotificationCategory,
  string
> = {
  general: "General",
  reservation: "Reservation",
  stay: "Stay",
  housekeeping: "Housekeeping",
  maintenance: "Maintenance",
  room_service: "Room Service",
  security: "Security",
  guest_documents: "Guest Documents",
  keys: "Keys",
  system: "System",
};

export const notificationSeverityLabels: Record<
  NotificationSeverity,
  string
> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  urgent: "Urgent",
};

export const notificationStatusLabels: Record<NotificationStatus, string> = {
  unread: "Unread",
  read: "Read",
  archived: "Archived",
};

export const notificationCategoryOptions: ReadonlyArray<{
  value: NotificationCategory;
  label: string;
}> = NOTIFICATION_CATEGORY_VALUES.map((value) => ({
  value,
  label: notificationCategoryLabels[value],
}));

export const notificationSeverityOptions: ReadonlyArray<{
  value: NotificationSeverity;
  label: string;
}> = NOTIFICATION_SEVERITY_VALUES.map((value) => ({
  value,
  label: notificationSeverityLabels[value],
}));

export const createNotificationSchema = z
  .object({
    recipientId: optionalUuid,
    campId: optionalUuid,

    title: z.preprocess(
      normalizeRequiredText,
      z
        .string()
        .min(2, "Title is required.")
        .max(160, "Title is too long."),
    ),

    body: z.preprocess(
      normalizeRequiredText,
      z
        .string()
        .min(2, "Message is required.")
        .max(1000, "Message is too long."),
    ),

    category: notificationCategorySchema,
    severity: notificationSeveritySchema,
    entityType: optionalEntityType,
    entityId: optionalUuid,
    actionHref: optionalActionHref,
  })
  .refine(
    (value) => {
      return Boolean(value.recipientId || value.campId);
    },
    {
      message: "Select a recipient or a camp.",
      path: ["recipientId"],
    },
  );

export const notificationIdSchema = z.object({
  notificationId: requiredUuid("Invalid notification."),
});

export type CreateNotificationInput = z.infer<
  typeof createNotificationSchema
>;

export type CreateNotificationFormInput = z.input<
  typeof createNotificationSchema
>;

export type NotificationIdInput = z.infer<typeof notificationIdSchema>;