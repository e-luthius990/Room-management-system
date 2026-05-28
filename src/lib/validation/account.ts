import { z } from "zod";

function optionalTrimmedText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      return value;
    });
}

export const updateOwnProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: optionalTrimmedText(40),
  department: optionalTrimmedText(120),
  jobTitle: optionalTrimmedText(120),
});

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
