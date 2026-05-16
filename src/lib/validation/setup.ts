import { z } from "zod";

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

function normalizeCode(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toUpperCase();
}

function normalizeBuildingCode(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizeKey(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function normalizeOptionalInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeRequiredInteger(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : Number.NaN;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const normalized = value.trim();

  if (!normalized) {
    return Number.NaN;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeCheckbox(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized === "on" ||
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes"
  );
}

function normalizeOptionalGenderRestriction(value: unknown): string | null {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  return normalized.toLowerCase();
}

const optionalText = z.preprocess(
  normalizeOptionalText,
  z.string().max(240, "This field is too long.").nullable(),
);

const requiredText = (label: string, max = 120) =>
  z.preprocess(
    normalizeRequiredText,
    z
      .string()
      .min(1, `${label} is required.`)
      .max(max, `${label} is too long.`),
  );

const requiredUuid = (message: string) =>
  z.preprocess(normalizeRequiredText, z.string().uuid(message));

const optionalInteger = (label: string, min: number, max: number) =>
  z.preprocess(
    normalizeOptionalInteger,
    z
      .number({
        error: `${label} must be a number.`,
      })
      .int(`${label} must be a whole number.`)
      .min(min, `${label} cannot be less than ${min}.`)
      .max(max, `${label} is too high.`)
      .nullable(),
  );

const requiredInteger = (label: string, min: number, max: number) =>
  z.preprocess(
    normalizeRequiredInteger,
    z
      .number({
        error: `${label} is required.`,
      })
      .int(`${label} must be a whole number.`)
      .min(min, `${label} must be at least ${min}.`)
      .max(max, `${label} is too high.`),
  );

const codeSchema = z.preprocess(
  normalizeCode,
  z
    .string()
    .min(2, "Code is required.")
    .max(40, "Code is too long.")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Use uppercase letters, numbers, underscores, or hyphens.",
    ),
);

const buildingCodeSchema = z.preprocess(
  normalizeBuildingCode,
  z
    .string()
    .min(1, "Building code is required.")
    .max(40, "Building code is too long."),
);

const keySchema = z.preprocess(
  normalizeKey,
  z
    .string()
    .min(2, "Key is required.")
    .max(60, "Key is too long.")
    .regex(
      /^[a-z0-9_]+$/,
      "Use lowercase letters, numbers, or underscores.",
    ),
);

const checkboxBoolean = z.preprocess(normalizeCheckbox, z.boolean());

export const campSchema = z.object({
  name: requiredText("Camp name"),
  code: codeSchema,
  location: optionalText,
  description: optionalText,
});

export const buildingSchema = z.object({
  campId: requiredUuid("Select a valid camp."),
  name: requiredText("Building name"),
  code: buildingCodeSchema,
  floorCount: optionalInteger("Floor count", 0, 100),
  description: optionalText,
});

export const roomTypeSchema = z.object({
  key: keySchema,
  name: requiredText("Room type name"),
  description: optionalText,
  defaultCapacity: optionalInteger("Default capacity", 1, 50),
});

export const amenitySchema = z.object({
  key: keySchema,
  name: requiredText("Amenity name"),
});

export const genderRestrictionSchema = z.preprocess(
  normalizeOptionalGenderRestriction,
  z.enum(["male", "female", "any"]).nullable(),
);

export const roomSchema = z.object({
  campId: requiredUuid("Select a valid camp."),
  buildingId: requiredUuid("Select a valid building."),
  roomTypeId: requiredUuid("Select a valid room type."),
  roomNumber: requiredText("Room number", 40),
  floorLabel: optionalText,
  sectionLabel: optionalText,
  capacity: requiredInteger("Capacity", 1, 50),
  bedType: optionalText,
  genderRestriction: genderRestrictionSchema,
  isVip: checkboxBoolean,
  isDelegateSuitable: checkboxBoolean,
  notes: optionalText,
});

export type CampInput = z.infer<typeof campSchema>;
export type BuildingInput = z.infer<typeof buildingSchema>;
export type RoomTypeInput = z.infer<typeof roomTypeSchema>;
export type AmenityInput = z.infer<typeof amenitySchema>;
export type RoomInput = z.infer<typeof roomSchema>;

export type CampFormInput = z.input<typeof campSchema>;
export type BuildingFormInput = z.input<typeof buildingSchema>;
export type RoomTypeFormInput = z.input<typeof roomTypeSchema>;
export type AmenityFormInput = z.input<typeof amenitySchema>;
export type RoomFormInput = z.input<typeof roomSchema>;