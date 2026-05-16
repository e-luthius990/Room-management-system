import { z } from "zod";

const CLEARANCE_STATUS_VALUES = [
  "pending",
  "cleared",
  "watchlist",
  "denied",
  "suspended",
] as const;

const RISK_LEVEL_VALUES = [
  "low",
  "normal",
  "elevated",
  "high",
  "critical",
] as const;

const SECURITY_VISIT_TYPE_VALUES = [
  "day_visitor",
  "overnight_guest",
  "contractor",
  "delegate",
  "staff_visit",
  "delivery",
  "vip",
  "other",
] as const;

export type ClearanceStatus = (typeof CLEARANCE_STATUS_VALUES)[number];

export type RiskLevel = (typeof RISK_LEVEL_VALUES)[number];

export type SecurityVisitType = (typeof SECURITY_VISIT_TYPE_VALUES)[number];

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

function localDateTimeToEatIso(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const clean = value.trim();

  if (!clean) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) {
    return `${clean}:00+03:00`;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(clean)) {
    return `${clean}+03:00`;
  }

  return clean;
}

function isValidDateTime(value: string | null): boolean {
  if (!value) {
    return true;
  }

  const date = new Date(value);

  return Number.isFinite(date.getTime());
}

const requiredUuid = (message: string) =>
  z.preprocess(normalizeRequiredText, z.string().uuid(message));

const optionalSecurityNotes = z.preprocess(
  normalizeOptionalText,
  z.string().max(1000, "Security notes are too long.").nullable(),
);

const requiredSecurityPurpose = z.preprocess(
  normalizeRequiredText,
  z
    .string()
    .min(2, "Purpose is required.")
    .max(300, "Purpose is too long."),
);

const optionalHostName = z.preprocess(
  normalizeOptionalText,
  z.string().max(150, "Host name is too long.").nullable(),
);

const optionalHostDepartment = z.preprocess(
  normalizeOptionalText,
  z.string().max(150, "Host department is too long.").nullable(),
);

const optionalExitNotes = z.preprocess(
  normalizeOptionalText,
  z.string().max(1000, "Exit notes are too long.").nullable(),
);

const optionalExpiryDateTime = z
  .preprocess(normalizeOptionalText, z.string().nullable())
  .transform(localDateTimeToEatIso)
  .refine(isValidDateTime, {
    message: "Enter a valid expiry date and time.",
  });

export const clearanceStatusSchema = z.preprocess(
  normalizeLowerText,
  z.enum(CLEARANCE_STATUS_VALUES),
);

export const riskLevelSchema = z.preprocess(
  normalizeLowerText,
  z.enum(RISK_LEVEL_VALUES),
);

export const securityVisitTypeSchema = z.preprocess(
  normalizeLowerText,
  z.enum(SECURITY_VISIT_TYPE_VALUES),
);

export const clearanceStatusLabels: Record<ClearanceStatus, string> = {
  pending: "Pending",
  cleared: "Cleared",
  watchlist: "Watchlist",
  denied: "Denied",
  suspended: "Suspended",
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  low: "Low",
  normal: "Normal",
  elevated: "Elevated",
  high: "High",
  critical: "Critical",
};

export const securityVisitTypeLabels: Record<SecurityVisitType, string> = {
  day_visitor: "Day visitor",
  overnight_guest: "Overnight guest",
  contractor: "Contractor",
  delegate: "Delegate",
  staff_visit: "Staff visit",
  delivery: "Delivery",
  vip: "VIP",
  other: "Other",
};

export const clearanceStatusOptions: ReadonlyArray<{
  value: ClearanceStatus;
  label: string;
}> = CLEARANCE_STATUS_VALUES.map((value) => ({
  value,
  label: clearanceStatusLabels[value],
}));

export const riskLevelOptions: ReadonlyArray<{
  value: RiskLevel;
  label: string;
}> = RISK_LEVEL_VALUES.map((value) => ({
  value,
  label: riskLevelLabels[value],
}));

export const securityVisitTypeOptions: ReadonlyArray<{
  value: SecurityVisitType;
  label: string;
}> = SECURITY_VISIT_TYPE_VALUES.map((value) => ({
  value,
  label: securityVisitTypeLabels[value],
}));

export const createSecurityClearanceEventSchema = z
  .object({
    guestId: requiredUuid("Invalid guest."),
    newStatus: clearanceStatusSchema,
    riskLevel: riskLevelSchema,
    notes: optionalSecurityNotes,
    expiresAt: optionalExpiryDateTime,
  })
  .refine(
    (value) => {
      if (
        value.newStatus === "watchlist" ||
        value.newStatus === "denied" ||
        value.newStatus === "suspended" ||
        value.riskLevel === "high" ||
        value.riskLevel === "critical"
      ) {
        return Boolean(value.notes);
      }

      return true;
    },
    {
      message:
        "Security notes are required for restricted statuses or high-risk clearance decisions.",
      path: ["notes"],
    },
  );

export const recordSecurityGateEntrySchema = z
  .object({
    guestId: requiredUuid("Invalid guest."),
    campId: requiredUuid("Invalid camp."),
    visitType: securityVisitTypeSchema,
    clearanceStatus: clearanceStatusSchema.default("cleared"),
    riskLevel: riskLevelSchema.default("normal"),
    purpose: requiredSecurityPurpose,
    hostName: optionalHostName,
    hostDepartment: optionalHostDepartment,
    notes: optionalSecurityNotes,
  })
  .refine(
    (value) => {
      if (
        value.clearanceStatus === "watchlist" ||
        value.clearanceStatus === "denied" ||
        value.clearanceStatus === "suspended" ||
        value.riskLevel === "high" ||
        value.riskLevel === "critical"
      ) {
        return Boolean(value.notes);
      }

      return true;
    },
    {
      message:
        "Security notes are required for restricted statuses or high-risk gate entries.",
      path: ["notes"],
    },
  )
  .refine(
    (value) => {
      if (
        value.visitType === "day_visitor" ||
        value.visitType === "contractor" ||
        value.visitType === "staff_visit" ||
        value.visitType === "delivery"
      ) {
        return Boolean(value.hostName) || Boolean(value.hostDepartment);
      }

      return true;
    },
    {
      message:
        "Host name or host department is required for visitors, contractors, staff visits, and deliveries.",
      path: ["hostName"],
    },
  );

export const sendGuestToReceptionSchema = z.object({
  securityEventId: requiredUuid("Invalid security event."),
  notes: optionalSecurityNotes,
});

export const markSecurityGateExitSchema = z.object({
  securityEventId: requiredUuid("Invalid security event."),
  exitNotes: optionalExitNotes,
});

export const findPossibleGuestMatchesSchema = z.object({
  fullName: z.preprocess(
    normalizeOptionalText,
    z.string().max(200, "Full name is too long.").nullable(),
  ),
  phone: z.preprocess(
    normalizeOptionalText,
    z.string().max(50, "Phone number is too long.").nullable(),
  ),
  email: z.preprocess(
    normalizeOptionalText,
    z.string().email("Enter a valid email.").max(254).nullable(),
  ),
  idOrPassportNumber: z.preprocess(
    normalizeOptionalText,
    z.string().max(100, "ID or passport number is too long.").nullable(),
  ),
  nationality: z.preprocess(
    normalizeOptionalText,
    z.string().max(100, "Nationality is too long.").nullable(),
  ),
  organization: z.preprocess(
    normalizeOptionalText,
    z.string().max(200, "Organization is too long.").nullable(),
  ),
  campId: requiredUuid("Invalid camp."),
});

export type CreateSecurityClearanceEventInput = z.infer<
  typeof createSecurityClearanceEventSchema
>;

export type CreateSecurityClearanceEventFormInput = z.input<
  typeof createSecurityClearanceEventSchema
>;

export type RecordSecurityGateEntryInput = z.infer<
  typeof recordSecurityGateEntrySchema
>;

export type RecordSecurityGateEntryFormInput = z.input<
  typeof recordSecurityGateEntrySchema
>;

export type SendGuestToReceptionInput = z.infer<
  typeof sendGuestToReceptionSchema
>;

export type SendGuestToReceptionFormInput = z.input<
  typeof sendGuestToReceptionSchema
>;

export type MarkSecurityGateExitInput = z.infer<
  typeof markSecurityGateExitSchema
>;

export type MarkSecurityGateExitFormInput = z.input<
  typeof markSecurityGateExitSchema
>;

export type FindPossibleGuestMatchesInput = z.infer<
  typeof findPossibleGuestMatchesSchema
>;

export type FindPossibleGuestMatchesFormInput = z.input<
  typeof findPossibleGuestMatchesSchema
>;