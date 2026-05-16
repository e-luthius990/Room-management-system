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

const requiredUuid = (message: string) =>
  z.preprocess(normalizeRequiredText, z.string().uuid(message));

const optionalText = z.preprocess(
  normalizeOptionalText,
  z.string().max(700, "This field is too long.").nullable(),
);

export const checkInReservationSchema = z.object({
  reservationId: requiredUuid("Invalid reservation."),
  notes: optionalText,
});

export const checkInStaySchema = z.object({
  stayId: requiredUuid("Invalid stay."),
  notes: optionalText,
});

export const checkOutStaySchema = z.object({
  stayId: requiredUuid("Invalid stay."),
  notes: optionalText,
});

export type CheckInReservationInput = z.infer<
  typeof checkInReservationSchema
>;

export type CheckInStayInput = z.infer<typeof checkInStaySchema>;

export type CheckOutStayInput = z.infer<typeof checkOutStaySchema>;

export type CheckInReservationFormInput = z.input<
  typeof checkInReservationSchema
>;

export type CheckInStayFormInput = z.input<typeof checkInStaySchema>;

export type CheckOutStayFormInput = z.input<typeof checkOutStaySchema>;