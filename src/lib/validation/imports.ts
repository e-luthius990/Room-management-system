import { z } from "zod";

const MAX_IMPORT_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const importTypeSchema = z.enum([
  "rooms_csv",
  "guests_csv",
]);

export const importStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "completed_with_errors",
  "failed",
  "cancelled",
]);

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > 0 ? normalized : null;
}

export const createImportBatchSchema = z.object({
  campId: z.string().uuid("Select a valid camp."),
  importType: importTypeSchema,
});

export const importCsvFileSchema = z
  .instanceof(File, {
    message: "Select a CSV file.",
  })
  .refine((file) => file.size > 0, "Select a CSV file.")
  .refine(
    (file) => file.size <= MAX_IMPORT_FILE_SIZE_BYTES,
    "CSV file is too large. Maximum size is 20MB.",
  )
  .refine((file) => {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    return (
      name.endsWith(".csv") ||
      type === "text/csv" ||
      type === "application/vnd.ms-excel"
    );
  }, "Only CSV files are supported.");

export const uploadImportBatchSchema = z.object({
  campId: z.string().uuid("Select a valid camp."),
  importType: importTypeSchema,
  file: importCsvFileSchema,
  notes: z.preprocess(
    normalizeOptionalText,
    z.string().max(500, "Notes are too long.").nullable(),
  ),
});

export type ImportType = z.infer<typeof importTypeSchema>;
export type ImportStatus = z.infer<typeof importStatusSchema>;

export type CreateImportBatchInput = z.infer<
  typeof createImportBatchSchema
>;

export type UploadImportBatchInput = z.infer<
  typeof uploadImportBatchSchema
>;