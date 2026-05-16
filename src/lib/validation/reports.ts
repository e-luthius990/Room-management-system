import { z } from "zod";

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeExportFormat(value: unknown): "csv" | "xlsx" | "pdf" {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return "csv";
  }

  const lowerValue = normalized.toLowerCase();

  if (lowerValue === "csv" || lowerValue === "xlsx" || lowerValue === "pdf") {
    return lowerValue;
  }

  return "csv";
}

function toEatStartOfDay(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return `${value}T00:00:00+03:00`;
}

function toEatEndOfDay(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return `${value}T23:59:59+03:00`;
}

const optionalUuid = z.preprocess(
  normalizeOptionalText,
  z.string().uuid("Invalid camp.").nullable(),
);

const optionalStartDate = z
  .preprocess(
    normalizeOptionalText,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid start date.")
      .nullable(),
  )
  .transform(toEatStartOfDay);

const optionalEndDate = z
  .preprocess(
    normalizeOptionalText,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid end date.")
      .nullable(),
  )
  .transform(toEatEndOfDay);

export const reportTypeSchema = z.enum([
  "occupancy",
  "guests",
  "rooms",
  "maintenance",
  "housekeeping",
  "room_service",
]);

export const exportFormatSchema = z.preprocess(
  normalizeExportFormat,
  z.enum(["csv", "xlsx", "pdf"]),
);

export type ReportType = z.infer<typeof reportTypeSchema>;

export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const reportTypeLabels: Record<ReportType, string> = {
  occupancy: "Occupancy",
  guests: "Guests",
  rooms: "Rooms",
  maintenance: "Maintenance",
  housekeeping: "Housekeeping",
  room_service: "Room service",
};

export const exportFormatLabels: Record<ExportFormat, string> = {
  csv: "CSV",
  xlsx: "Excel",
  pdf: "PDF",
};

const reportTypeValues = reportTypeSchema.options;

const exportFormatValues = ["csv", "xlsx", "pdf"] as const;

export const reportTypeOptions: ReadonlyArray<{
  value: ReportType;
  label: string;
}> = reportTypeValues.map((value) => ({
  value,
  label: reportTypeLabels[value],
}));

export const exportFormatOptions: ReadonlyArray<{
  value: ExportFormat;
  label: string;
}> = exportFormatValues.map((value) => ({
  value,
  label: exportFormatLabels[value],
}));

export const createReportExportSchema = z
  .object({
    reportType: reportTypeSchema,
    exportFormat: exportFormatSchema,
    campId: optionalUuid,
    dateFrom: optionalStartDate,
    dateTo: optionalEndDate,
  })
  .refine(
    (value) => {
      if (!value.dateFrom || !value.dateTo) {
        return true;
      }

      const from = new Date(value.dateFrom).getTime();
      const to = new Date(value.dateTo).getTime();

      return Number.isFinite(from) && Number.isFinite(to) && to > from;
    },
    {
      message: "Date range is invalid.",
      path: ["dateTo"],
    },
  );

export type CreateReportExportInput = z.infer<
  typeof createReportExportSchema
>;

export type CreateReportExportFormInput = z.input<
  typeof createReportExportSchema
>;