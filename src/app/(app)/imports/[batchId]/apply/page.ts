import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ApplyImportPageProps = {
  params: Promise<{
    batchId: string;
  }>;
};

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

export default async function ApplyImportPage({
  params,
}: ApplyImportPageProps): Promise<never> {
  await requirePermission("imports.upload");

  const { batchId } = await params;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("apply_data_import_batch", {
    p_batch_id: batchId,
  });

  if (error) {
    redirect(
      `/imports/${encodeURIComponent(batchId)}?error=${mapApplyImportError(
        error.message,
      )}`,
    );
  }

  revalidatePath("/imports");
  revalidatePath(`/imports/${batchId}`);
  revalidatePath("/rooms");
  revalidatePath("/room-board");
  revalidatePath("/guests");

  redirect(`/imports/${encodeURIComponent(batchId)}?success=import_applied`);
}