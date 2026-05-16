// src/lib/validation/allocations.ts

import { z } from "zod";

function normalizeRequiredText(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > 0 ? normalized : null;
}

function isValidDateInput(value: string): boolean {
  const date = new Date(value);

  return Number.isFinite(date.getTime());
}

function toIsoDateTime(value: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new Error("Invalid date input.");
  }

  return date.toISOString();
}

export const allocationStatusSchema = z.enum([
  "active",
  "cancelled",
  "checked_in",
  "expired",
]);

export type AllocationStatusInput = z.infer<typeof allocationStatusSchema>;

export const allocationListFilterSchema = z
  .enum(["active", "checked_in", "cancelled", "expired", "all"])
  .catch("active");

export type AllocationListFilterInput = z.infer<
  typeof allocationListFilterSchema
>;

export const createAllocationSchema = z
  .object({
    guest_id: z.preprocess(
      normalizeRequiredText,
      z.string().uuid("Select a valid guest."),
    ),

    room_id: z.preprocess(
      normalizeRequiredText,
      z.string().uuid("Select a valid room."),
    ),

    expected_arrival_at: z.preprocess(
      normalizeRequiredText,
      z
        .string()
        .min(1, "Expected arrival is required.")
        .refine(isValidDateInput, "Expected arrival is invalid."),
    ),

    expected_departure_at: z.preprocess(
      normalizeRequiredText,
      z
        .string()
        .min(1, "Expected departure is required.")
        .refine(isValidDateInput, "Expected departure is invalid."),
    ),

    notes: z
      .preprocess(
        normalizeOptionalText,
        z.string().max(700, "Allocation note is too long.").nullable(),
      )
      .optional(),
  })
  .superRefine((value, context) => {
    const arrival = new Date(value.expected_arrival_at);
    const departure = new Date(value.expected_departure_at);

    if (
      !Number.isFinite(arrival.getTime()) ||
      !Number.isFinite(departure.getTime())
    ) {
      return;
    }

    if (departure <= arrival) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expected_departure_at"],
        message: "Expected departure must be after expected arrival.",
      });
    }
  });

export type CreateAllocationInput = z.infer<typeof createAllocationSchema>;

export function allocationInputToRpcPayload(input: CreateAllocationInput): {
  p_guest_id: string;
  p_room_id: string;
  p_expected_arrival_at: string;
  p_expected_departure_at: string;
  p_notes?: string;
} {
  return {
    p_guest_id: input.guest_id,
    p_room_id: input.room_id,
    p_expected_arrival_at: toIsoDateTime(input.expected_arrival_at),
    p_expected_departure_at: toIsoDateTime(input.expected_departure_at),
    ...(input.notes ? { p_notes: input.notes } : {}),
  };
}

function getFormString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export function getCreateAllocationFormValues(formData: FormData): {
  guest_id: string;
  room_id: string;
  expected_arrival_at: string;
  expected_departure_at: string;
  notes: string;
} {
  return {
    guest_id: getFormString(formData, "guest_id"),
    room_id: getFormString(formData, "room_id"),
    expected_arrival_at: getFormString(formData, "expected_arrival_at"),
    expected_departure_at: getFormString(formData, "expected_departure_at"),
    notes: getFormString(formData, "notes"),
  };
}

export function formatAllocationValidationError(error: z.ZodError): string {
  return (
    error.issues[0]?.message ?? "Check the room allocation form and try again."
  );
}