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

function localDateTimeToEatIso(value: string): string {
  const clean = value.trim();

  if (!clean) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(clean)) {
    return `${clean}:00+03:00`;
  }

  return clean;
}

function checkboxToBoolean(value: unknown): boolean {
  return value === "on" || value === "true" || value === "1" || value === true;
}

const optionalText = z.preprocess(
  normalizeOptionalText,
  z.string().max(500, "This field is too long.").nullable(),
);

const optionalUuid = z.preprocess(
  normalizeOptionalText,
  z.string().uuid("Invalid selection.").nullable(),
);

const requiredDateTime = z
  .preprocess(
    normalizeRequiredText,
    z.string().min(1, "Date/time is required."),
  )
  .transform(localDateTimeToEatIso)
  .refine((value) => {
    const timestamp = new Date(value).getTime();

    return Number.isFinite(timestamp);
  }, "Enter a valid date/time.");

export const createReservationSchema = z
  .object({
    guestId: z.string().uuid("Select a valid guest."),
    groupId: optionalUuid,
    roomId: z.string().uuid("Select a valid room."),
    expectedArrivalAt: requiredDateTime,
    expectedDepartureAt: requiredDateTime,
    isVipHold: z.preprocess(checkboxToBoolean, z.boolean()),
    notes: optionalText,
  })
  .refine(
    (value) => {
      const arrival = new Date(value.expectedArrivalAt).getTime();
      const departure = new Date(value.expectedDepartureAt).getTime();

      return (
        Number.isFinite(arrival) &&
        Number.isFinite(departure) &&
        departure > arrival
      );
    },
    {
      message: "Expected departure must be after expected arrival.",
      path: ["expectedDepartureAt"],
    },
  );

export const cancelReservationSchema = z.object({
  reservationId: z.string().uuid("Invalid reservation."),
  reason: z.preprocess(
    normalizeRequiredText,
    z
      .string()
      .min(3, "Cancellation reason is required.")
      .max(500, "Reason is too long."),
  ),
});

export const noShowReservationSchema = z.object({
  reservationId: z.string().uuid("Invalid reservation."),
  reason: optionalText,
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type NoShowReservationInput = z.infer<typeof noShowReservationSchema>;