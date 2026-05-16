"use server";

import "server-only";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uploadGuestDocumentSchema } from "@/lib/validation/guest-documents";

const BUCKET = "guest-documents";
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function buildGuestRedirectPath(
  guestId: string | null,
  params: Record<string, string>,
): string {
  const searchParams = new URLSearchParams(params);

  if (!guestId) {
    return `/guests?${searchParams.toString()}`;
  }

  return `/guests/${encodeURIComponent(guestId)}?${searchParams.toString()}`;
}

function sanitizeFilename(filename: string): string {
  const clean = filename
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return clean || "document";
}

function mapUploadError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("unsupported document file type") ||
    normalized.includes("invalid guest document type") ||
    normalized.includes("mime") ||
    normalized.includes("type")
  ) {
    return "unsupported_file_type";
  }

  if (
    normalized.includes("document file size is invalid") ||
    normalized.includes("size")
  ) {
    return "file_too_large";
  }

  if (normalized.includes("guest not found")) {
    return "guest_not_found";
  }

  if (
    normalized.includes("invalid storage bucket") ||
    normalized.includes("invalid storage path")
  ) {
    return "invalid_document_storage";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  return "upload_failed";
}

export async function uploadGuestDocumentAction(
  formData: FormData,
): Promise<never> {
  await requirePermission("guest_documents.upload");

  const guestId = getFormString(formData, "guestId");

  const parsed = uploadGuestDocumentSchema.safeParse({
    guestId,
    documentType: getFormString(formData, "documentType"),
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(
      buildGuestRedirectPath(guestId, {
        error: "invalid_document_input",
      }),
    );
  }

  const fileValue = formData.get("file");

  if (!(fileValue instanceof File) || fileValue.size <= 0) {
    redirect(
      buildGuestRedirectPath(parsed.data.guestId, {
        error: "document_file_required",
      }),
    );
  }

  if (!allowedMimeTypes.has(fileValue.type)) {
    redirect(
      buildGuestRedirectPath(parsed.data.guestId, {
        error: "unsupported_file_type",
      }),
    );
  }

  if (fileValue.size > MAX_SIZE_BYTES) {
    redirect(
      buildGuestRedirectPath(parsed.data.guestId, {
        error: "file_too_large",
      }),
    );
  }

  const supabase = await createServerSupabaseClient();

  const safeFilename = sanitizeFilename(fileValue.name);
  const storagePath = `${parsed.data.guestId}/${randomUUID()}-${safeFilename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileValue, {
      contentType: fileValue.type,
      upsert: false,
    });

  if (uploadError) {
    redirect(
      buildGuestRedirectPath(parsed.data.guestId, {
        error: mapUploadError(uploadError.message),
      }),
    );
  }

  const { error: rpcError } = await supabase.rpc(
    "register_guest_document_upload",
    {
      p_guest_id: parsed.data.guestId,
      p_document_type: parsed.data.documentType,
      p_storage_bucket: BUCKET,
      p_storage_path: storagePath,
      p_original_filename: fileValue.name,
      p_mime_type: fileValue.type,
      p_size_bytes: fileValue.size,
      p_notes: parsed.data.notes ?? "",
    },
  );

  if (rpcError) {
    const { error: cleanupError } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);

    if (cleanupError) {
      console.error("Failed to clean up guest document upload:", {
        storagePath,
        message: cleanupError.message,
      });
    }

    redirect(
      buildGuestRedirectPath(parsed.data.guestId, {
        error: mapUploadError(rpcError.message),
      }),
    );
  }

  revalidatePath("/guests");
  revalidatePath(`/guests/${parsed.data.guestId}`);
  revalidatePath("/guest-documents/review");

  redirect(
    buildGuestRedirectPath(parsed.data.guestId, {
      success: "document_uploaded",
    }),
  );
}