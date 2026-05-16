import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ImportType = "rooms_csv" | "guests_csv";

export type ImportStatus =
  | "pending"
  | "processing"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

type MaybeArrayRelation<T> = T | T[] | null;

function getSingleRelation<T>(relation: MaybeArrayRelation<T>): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export type ImportBatchListItem = {
  id: string;
  camp_id: string | null;
  camp_name: string;
  import_type: ImportType;
  status: ImportStatus;
  original_filename: string | null;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  failed_at: string | null;
};

type ImportBatchListRow = {
  id: string;
  camp_id: string | null;
  import_type: ImportType;
  status: ImportStatus;
  original_filename: string | null;
  total_rows: number;
  valid_rows: number | null;
  invalid_rows: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  failed_at: string | null;
  camps: MaybeArrayRelation<{ name: string | null }>;
};

export async function getImportBatches(): Promise<ImportBatchListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("data_import_batches")
    .select(
      [
        "id",
        "camp_id",
        "import_type",
        "status",
        "original_filename",
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
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<ImportBatchListRow[]>();

  if (error) {
    throw new Error(`Failed to load import batches: ${error.message}`);
  }

  return (data ?? []).map((batch) => {
    const camp = getSingleRelation(batch.camps);

    return {
      id: batch.id,
      camp_id: batch.camp_id,
      camp_name: camp?.name ?? "No camp",
      import_type: batch.import_type,
      status: batch.status,
      original_filename: batch.original_filename,
      total_rows: batch.total_rows,
      valid_rows: batch.valid_rows ?? 0,
      invalid_rows: batch.invalid_rows ?? 0,
      error_message: batch.error_message,
      created_at: batch.created_at,
      completed_at: batch.completed_at,
      failed_at: batch.failed_at,
    };
  });
}