import { z } from "zod";

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function optionalText(label: string, max = 240) {
  return z.preprocess(
    normalizeOptionalText,
    z.string().max(max, `${label} is too long.`).nullable(),
  );
}

function requiredText(label: string, max = 160) {
  return z.preprocess(
    normalizeRequiredText,
    z
      .string()
      .min(2, `${label} must be at least 2 characters.`)
      .max(max, `${label} is too long.`),
  );
}

function optionalEmail() {
  return z.preprocess(
    normalizeOptionalText,
    z
      .string()
      .email("Enter a valid email address.")
      .max(254, "Email address is too long.")
      .transform((value) => value.toLowerCase())
      .nullable(),
  );
}

function optionalPhone(label: string) {
  return z.preprocess(
    normalizeOptionalText,
    z
      .string()
      .min(7, `${label} is too short.`)
      .max(32, `${label} is too long.`)
      .regex(
        /^[+()0-9\s.-]+$/,
        `${label} can only contain numbers, spaces, +, -, dots, and brackets.`,
      )
      .nullable(),
  );
}

const checkboxBoolean = z.preprocess((value) => {
  if (value === true || value === "true" || value === "on" || value === "1") {
    return true;
  }

  return false;
}, z.boolean());

export const guestCategorySchema = z.enum([
  "eu_delegate",
  "american_delegate",
  "government_official",
  "company_staff",
  "contractor",
  "consultant",
  "visitor",
  "transit_guest",
  "vip_guest",
  "long_stay_guest",
]);

export const guestGenderSchema = z.enum([
  "male",
  "female",
  "other",
  "undisclosed",
]);

const guestBaseSchema = z.object({
  fullName: requiredText("Full name", 160),
  primaryCampId: z.string().uuid("Select a valid primary camp."),
  guestCategory: guestCategorySchema,

  gender: z.preprocess(normalizeOptionalText, guestGenderSchema.nullable()),

  nationality: optionalText("Nationality", 120),
  organizationName: optionalText("Organization", 160),
  departmentOrProject: optionalText("Department or project", 160),

  phone: optionalPhone("Phone number"),
  email: optionalEmail(),

  idOrPassportNumber: optionalText("ID or passport number", 120),
  emergencyContactName: optionalText("Emergency contact name", 160),
  emergencyContactPhone: optionalPhone("Emergency contact phone"),

  isVip: checkboxBoolean.default(false),

  securityClearanceStatus: optionalText("Security clearance status", 80),

  notes: optionalText("Notes", 1000),
  managerNotes: optionalText("Manager notes", 1000),
});

function applyGuestDerivedFields<T extends z.infer<typeof guestBaseSchema>>(
  value: T,
): T & { isVip: boolean } {
  return {
    ...value,
    isVip: value.isVip || value.guestCategory === "vip_guest",
  };
}

export const createGuestSchema = guestBaseSchema.transform(
  applyGuestDerivedFields,
);

export const updateGuestSchema = guestBaseSchema
  .extend({
    guestId: z.string().uuid("Invalid guest."),
  })
  .transform(applyGuestDerivedFields);

export type GuestCategory = z.infer<typeof guestCategorySchema>;
export type GuestGender = z.infer<typeof guestGenderSchema>;

export type CreateGuestInput = z.infer<typeof createGuestSchema>;
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>;