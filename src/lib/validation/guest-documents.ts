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

export const guestDocumentStatusSchema = z.enum([
  "pending_review",
  "approved",
  "rejected",
  "archived",
  "deleted",
]);

export const guestDocumentReviewStatusSchema = z.enum([
  "approved",
  "rejected",
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

export const reviewGuestDocumentSchema = z
  .object({
    documentId: z.string().uuid("Invalid document."),
    status: guestDocumentReviewStatusSchema,
    reviewNotes: z
      .string()
      .trim()
      .max(1000, "Review notes are too long.")
      .optional()
      .transform((value) => {
        if (!value) return null;
        return value;
      }),
  })
  .superRefine((value, ctx) => {
    if (value.status === "rejected" && !value.reviewNotes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reviewNotes"],
        message: "Review notes are required when rejecting a document.",
      });
    }
  });

export type GuestDocumentType = z.infer<typeof guestDocumentTypeSchema>;
export type GuestDocumentStatus = z.infer<typeof guestDocumentStatusSchema>;

export type UploadGuestDocumentInput = z.infer<
  typeof uploadGuestDocumentSchema
>;

export type ReviewGuestDocumentInput = z.infer<
  typeof reviewGuestDocumentSchema
>;