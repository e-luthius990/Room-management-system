import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ApplyImportPageProps = {
  params: Promise<{
    batchId: string;
  }>;
};

type ImportBatchPermissionRow = {
  id: string;
  import_type: "rooms_csv" | "guests_csv" | string | null;
};

const IMPORT_BASE_PERMISSIONS = [
  "data.import",
  "imports.rooms",
  "imports.guests",
  "imports.upload",
] as const;

function mapApplyImportError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("not found")) {
    return "batch_not_found";
  }

  if (
    normalized.includes("only completed") ||
    normalized.includes("status") ||
    normalized.includes("processing")
  ) {
    return "batch_not_ready";
  }

  if (
    normalized.includes("already been applied") ||
    normalized.includes("already applied")
  ) {
    return "already_applied";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("access") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  return "apply_failed";
}

function getImportTypePermission(importType: string | null): string | null {
  switch (importType) {
    case "rooms_csv":
      return "imports.rooms";
    case "guests_csv":
      return "imports.guests";
    default:
      return null;
  }
}

function redirectToBatch(batchId: string, key: string): never {
  redirect(`/imports/${encodeURIComponent(batchId)}?error=${key}`);
}

export default async function ApplyImportPage({
  params,
}: ApplyImportPageProps): Promise<never> {
  const { batchId } = await params;

  await requireAnyPermission([...IMPORT_BASE_PERMISSIONS]);

  const supabase = await createServerSupabaseClient();

  const { data: batch, error: batchError } = await supabase
    .from("data_import_batches")
    .select("id,import_type")
    .eq("id", batchId)
    .is("archived_at", null)
    .returns<ImportBatchPermissionRow[]>()
    .maybeSingle();

  if (batchError) {
    redirectToBatch(batchId, mapApplyImportError(batchError.message));
  }

  if (!batch) {
    redirectToBatch(batchId, "batch_not_found");
  }

  const importPermission = getImportTypePermission(batch.import_type);

  if (!importPermission) {
    redirectToBatch(batchId, "invalid_import_type");
  }

  await requireAnyPermission(["data.import", importPermission]);

  const { error } = await supabase.rpc("apply_data_import_batch", {
    p_batch_id: batchId,
  });

  if (error) {
    redirectToBatch(batchId, mapApplyImportError(error.message));
  }

  revalidatePath("/imports");
  revalidatePath(`/imports/${batchId}`);
  revalidatePath("/rooms");
  revalidatePath("/room-board");
  revalidatePath("/guests");
  revalidatePath("/dashboard/camp-manager");
  revalidatePath("/dashboard/camp-manager/available-rooms");
  revalidatePath("/dashboard/camp-manager/occupied-rooms");

  redirect(`/imports/${encodeURIComponent(batchId)}?success=import_applied`);
}