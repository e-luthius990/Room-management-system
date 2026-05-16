"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { reviewGuestDocumentSchema } from "@/lib/validation/guest-documents";

type ReviewActionError =
  | "invalid_input"
  | "document_not_found"
  | "review_note_required"
  | "invalid_review_status"
  | "document_not_pending_review"
  | "access_denied"
  | "review_failed";

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function buildDetailRedirectPath(
  documentId: string | null,
  params: Record<string, string>,
): string {
  const searchParams = new URLSearchParams(params);

  if (!documentId) {
    return `/guest-documents/review?${searchParams.toString()}`;
  }

  return `/guest-documents/${encodeURIComponent(documentId)}?${searchParams.toString()}`;
}

function mapReviewError(message: string): ReviewActionError {
  const normalized = message.toLowerCase();

  if (normalized.includes("not found")) {
    return "document_not_found";
  }

  if (normalized.includes("review notes are required")) {
    return "review_note_required";
  }

  if (normalized.includes("invalid document review status")) {
    return "invalid_review_status";
  }

  if (
    normalized.includes("only pending guest documents can be reviewed") ||
    normalized.includes("only pending documents can be reviewed")
  ) {
    return "document_not_pending_review";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  return "review_failed";
}

export async function reviewGuestDocumentAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("guest_documents.review");

  const documentId = getFormString(formData, "documentId");

  const parsed = reviewGuestDocumentSchema.safeParse({
    documentId,
    status: getFormString(formData, "status"),
    reviewNotes: getFormString(formData, "reviewNotes"),
  });

  if (!parsed.success) {
    redirect(
      buildDetailRedirectPath(documentId, {
        error: "invalid_input",
      }),
    );
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc("review_guest_document", {
    p_document_id: parsed.data.documentId,
    p_status: parsed.data.status,
    p_review_notes: parsed.data.reviewNotes ?? "",
  });

  if (error) {
    redirect(
      buildDetailRedirectPath(parsed.data.documentId, {
        error: mapReviewError(error.message),
      }),
    );
  }

  revalidatePath("/guest-documents/review");
  revalidatePath(`/guest-documents/${parsed.data.documentId}`);

  redirect(
    buildDetailRedirectPath(parsed.data.documentId, {
      success: "document_reviewed",
    }),
  );
}