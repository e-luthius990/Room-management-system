import "server-only";

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ImportType = "rooms_csv" | "guests_csv";

export type ImportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

export type ImportRowValidationStatus = "pending" | "valid" | "invalid";

type MaybeArrayRelation<T> = T | T[] | null;

function getSingleRelation<T>(relation: MaybeArrayRelation<T>): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export type ImportBatchDetail = {
  id: string;
  camp_id: string | null;
  camp_name: string;
  import_type: ImportType;
  status: ImportStatus;
  original_filename: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  failed_at: string | null;
};

export type ImportRowItem = {
  id: string;
  row_number: number;
  raw_payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown>;
  validation_status: ImportRowValidationStatus;
  error_messages: string[];
  created_at: string | null;
};

export type ImportDetailResult = {
  batch: ImportBatchDetail;
  rows: ImportRowItem[];
};

type ImportBatchDetailRow = {
  id: string;
  camp_id: string | null;
  import_type: ImportType;
  status: ImportStatus;
  original_filename: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  total_rows: number;
  valid_rows: number | null;
  invalid_rows: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  failed_at: string | null;
  camps: MaybeArrayRelation<{ name: string | null }>;
};

type ImportRowRecord = {
  id: string;
  row_number: number;
  raw_payload: unknown;
  normalized_payload: unknown;
  validation_status: ImportRowValidationStatus | null;
  error_messages: string[] | null;
  created_at: string | null;
};

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeValidationStatus(
  value: ImportRowValidationStatus | null,
): ImportRowValidationStatus {
  return value ?? "pending";
}

export async function getImportDetail(
  batchId: string,
): Promise<ImportDetailResult> {
  const supabase = await createServerSupabaseClient();

  const { data: batch, error: batchError } = await supabase
    .from("data_import_batches")
    .select(
      [
        "id",
        "camp_id",
        "import_type",
        "status",
        "original_filename",
        "storage_bucket",
        "storage_path",
        "total_rows",
        "valid_rows",
        "invalid_rows",
        "error_message",
        "created_at",
        "completed_at",
        "failed_at",
        "camps(name)",
      ].join(","),
    )
    .eq("id", batchId)
    .is("archived_at", null)
    .returns<ImportBatchDetailRow[]>()
    .maybeSingle();

  if (batchError) {
    throw new Error(`Failed to load import batch: ${batchError.message}`);
  }

  if (!batch) {
    notFound();
  }

  const { data: rows, error: rowsError } = await supabase
    .from("data_import_rows")
    .select(
      [
        "id",
        "row_number",
        "raw_payload",
        "normalized_payload",
        "validation_status",
        "error_messages",
        "created_at",
      ].join(","),
    )
    .eq("batch_id", batchId)
    .order("row_number", { ascending: true })
    .limit(500)
    .returns<ImportRowRecord[]>();

  if (rowsError) {
    throw new Error(`Failed to load import rows: ${rowsError.message}`);
  }

  const camp = getSingleRelation(batch.camps);

  return {
    batch: {
      id: batch.id,
      camp_id: batch.camp_id,
      camp_name: camp?.name ?? "No camp",
      import_type: batch.import_type,
      status: batch.status,
      original_filename: batch.original_filename,
      storage_bucket: batch.storage_bucket,
      storage_path: batch.storage_path,
      total_rows: batch.total_rows,
      valid_rows: batch.valid_rows ?? 0,
      invalid_rows: batch.invalid_rows ?? 0,
      error_message: batch.error_message,
      created_at: batch.created_at,
      completed_at: batch.completed_at,
      failed_at: batch.failed_at,
    },

    rows: (rows ?? []).map((row) => ({
      id: row.id,
      row_number: row.row_number,
      raw_payload: toRecord(row.raw_payload),
      normalized_payload: toRecord(row.normalized_payload),
      validation_status: normalizeValidationStatus(row.validation_status),
      error_messages: row.error_messages ?? [],
      created_at: row.created_at,
    })),
  };
}