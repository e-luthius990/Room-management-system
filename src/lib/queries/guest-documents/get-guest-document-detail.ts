import "server-only";

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type GuestDocumentStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "active"
  | "archived"
  | "deleted";

export type GuestDocumentDetail = {
  id: string;
  guest_id: string;
  guest_name: string;
  camp_id: string;
  camp_name: string;
  document_type: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: GuestDocumentStatus;
  notes: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
  created_at: string;
};

type GuestDocumentDetailRow = {
  id: string;
  guest_id: string;
  camp_id: string;
  document_type: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: GuestDocumentStatus;
  notes: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  uploaded_at: string;
  created_at: string;
  guests: { full_name: string | null } | null;
  camps: { name: string | null } | null;
};

export async function getGuestDocumentDetail(
  documentId: string,
): Promise<GuestDocumentDetail> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("guest_documents")
    .select(
      [
        "id",
        "guest_id",
        "camp_id",
        "document_type",
        "storage_bucket",
        "storage_path",
        "original_filename",
        "mime_type",
        "size_bytes",
        "status",
        "notes",
        "review_notes",
        "reviewed_at",
        "uploaded_at",
        "created_at",
        "guests(full_name)",
        "camps(name)",
      ].join(","),
    )
    .eq("id", documentId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()
    .returns<GuestDocumentDetailRow | null>();

  if (error) {
    throw new Error(`Failed to load guest document: ${error.message}`);
  }

  if (!data) {
    notFound();
  }

  return {
    id: data.id,
    guest_id: data.guest_id,
    guest_name: data.guests?.full_name ?? "Unknown guest",
    camp_id: data.camp_id,
    camp_name: data.camps?.name ?? "Unknown camp",
    document_type: data.document_type,
    storage_bucket: data.storage_bucket,
    storage_path: data.storage_path,
    original_filename: data.original_filename,
    mime_type: data.mime_type,
    size_bytes: data.size_bytes,
    status: data.status,
    notes: data.notes,
    review_notes: data.review_notes,
    reviewed_at: data.reviewed_at,
    uploaded_at: data.uploaded_at,
    created_at: data.created_at,
  };
}