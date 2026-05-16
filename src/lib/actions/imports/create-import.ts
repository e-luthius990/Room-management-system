"use server";

import "server-only";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uploadImportBatchSchema } from "@/lib/validation/imports";
import { parseCsv } from "@/lib/actions/imports/csv-parser";
import {
  validateGuestRow,
  validateImportHeaders,
  validateRoomRow,
} from "@/lib/actions/imports/validators";

const BUCKET = "imports";
const MAX_IMPORT_ROWS = 5000;

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function buildImportRedirectPath(
  batchId: string | null,
  params: Record<string, string>,
): string {
  const searchParams = new URLSearchParams(params);

  if (!batchId) {
    return `/imports/new?${searchParams.toString()}`;
  }

  return `/imports/${encodeURIComponent(batchId)}?${searchParams.toString()}`;
}

function sanitizeFilename(filename: string): string {
  const clean = filename
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return clean || "import.csv";
}

function normalizeImportMimeType(file: File): "text/csv" | "application/vnd.ms-excel" {
  const type = file.type.toLowerCase();

  if (type === "application/vnd.ms-excel") {
    return "application/vnd.ms-excel";
  }

  return "text/csv";
}

function mapImportError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid import type")) {
    return "invalid_import_type";
  }

  if (normalized.includes("unsupported import file type")) {
    return "csv_only";
  }

  if (normalized.includes("storage")) {
    return "storage_failed";
  }

  if (normalized.includes("file size") || normalized.includes("size")) {
    return "file_too_large";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("access") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  if (normalized.includes("batch")) {
    return "batch_failed";
  }

  return "import_failed";
}

export async function createImportBatchAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("imports.upload");

  const parsed = uploadImportBatchSchema.safeParse({
    campId: getFormString(formData, "campId"),
    importType: getFormString(formData, "importType"),
    file: formData.get("file"),
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(
      buildImportRedirectPath(null, {
        error: "invalid_input",
      }),
    );
  }

  const supabase = await createServerSupabaseClient();

  const file = parsed.data.file;
  const safeFilename = sanitizeFilename(file.name);
  const mimeType = normalizeImportMimeType(file);
  const storagePath = `${parsed.data.campId}/${parsed.data.importType}/${randomUUID()}-${safeFilename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    redirect(
      buildImportRedirectPath(null, {
        error: mapImportError(uploadError.message),
      }),
    );
  }

  const { data: batchId, error: batchError } = await supabase.rpc(
    "create_data_import_batch",
    {
      p_camp_id: parsed.data.campId,
      p_import_type: parsed.data.importType,
      p_storage_bucket: BUCKET,
      p_storage_path: storagePath,
      p_original_filename: file.name,
      p_mime_type: mimeType,
      p_size_bytes: file.size,
    },
  );

  if (batchError || !batchId) {
    const { error: cleanupError } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);

    if (cleanupError) {
      console.error("Failed to clean up import upload:", {
        storagePath,
        message: cleanupError.message,
      });
    }

    redirect(
      buildImportRedirectPath(null, {
        error: mapImportError(batchError?.message ?? "batch_failed"),
      }),
    );
  }

  try {
    const fileText = await file.text();
    const parsedCsv = parseCsv(fileText);

    if (parsedCsv.rows.length === 0) {
      throw new Error("CSV has no data rows.");
    }

    if (parsedCsv.rows.length > MAX_IMPORT_ROWS) {
      throw new Error(
        `CSV contains too many rows. Maximum allowed rows: ${MAX_IMPORT_ROWS}.`,
      );
    }

    const missingHeaders = validateImportHeaders(
      parsed.data.importType,
      parsedCsv.headers,
    );

    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(", ")}.`);
    }

    for (const [index, row] of parsedCsv.rows.entries()) {
      const validation =
        parsed.data.importType === "rooms_csv"
          ? validateRoomRow(row)
          : validateGuestRow(row);

      const { error: rowError } = await supabase.rpc(
        "record_data_import_row_result",
        {
          p_batch_id: batchId,
          p_row_number: index + 2,
          p_raw_payload: validation.rawPayload,
          p_normalized_payload: validation.normalizedPayload,
          p_validation_status: validation.status,
          p_error_messages: validation.errors,
        },
      );

      if (rowError) {
        throw new Error(rowError.message);
      }
    }

    const { error: completeError } = await supabase.rpc(
      "complete_data_import_batch",
      {
        p_batch_id: batchId,
      },
    );

    if (completeError) {
      throw new Error(completeError.message);
    }

    revalidatePath("/imports");
    revalidatePath(`/imports/${batchId}`);

    redirect(
      buildImportRedirectPath(batchId, {
        success: "import_validated",
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";

    const { error: failError } = await supabase.rpc("fail_data_import_batch", {
      p_batch_id: batchId,
      p_error_message: message,
    });

    if (failError) {
      console.error("Failed to mark import batch as failed:", {
        batchId,
        message: failError.message,
      });
    }

    revalidatePath("/imports");
    revalidatePath(`/imports/${batchId}`);

    redirect(
      buildImportRedirectPath(batchId, {
        error: "import_failed",
      }),
    );
  }
}