import { z } from "zod";

export const guestDocumentTypeSchema = z.enum([
  "passport",
  "national_id",
  "visa",
  "work_permit",
  "invitation_letter",
  "security_clearance",
  "other",
]);

export const uploadGuestDocumentSchema = z.object({
  guestId: z.string().uuid("Invalid guest."),
  documentType: guestDocumentTypeSchema,
  notes: z
    .string()
    .trim()
    .max(500, "Notes are too long.")
    .optional()
    .transform((value) => {
      if (!value) return null;
      return value;
    }),
});

export type GuestDocumentType = z.infer<typeof guestDocumentTypeSchema>;

export type UploadGuestDocumentInput = z.infer<
  typeof uploadGuestDocumentSchema
>;
