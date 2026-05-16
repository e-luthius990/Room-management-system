import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type GuestDocumentReviewItem = {
  id: string;
  guest_id: string;
  guest_name: string;
  camp_name: string;
  document_type: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: "pending_review";
  created_at: string;
};

type GuestDocumentReviewRow = {
  id: string;
  guest_id: string;
  document_type: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: "pending_review";
  created_at: string;
  guests: { full_name: string | null } | null;
  camps: { name: string | null } | null;
};

export async function getGuestDocumentReviewQueue(): Promise<
  GuestDocumentReviewItem[]
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("guest_documents")
    .select(
      [
        "id",
        "guest_id",
        "document_type",
        "original_filename",
        "mime_type",
        "size_bytes",
        "status",
        "created_at",
        "guests(full_name)",
        "camps(name)",
      ].join(","),
    )
    .eq("status", "pending_review")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<GuestDocumentReviewRow[]>();

  if (error) {
    throw new Error(`Failed to load guest document queue: ${error.message}`);
  }

  return (data ?? []).map((document) => ({
    id: document.id,
    guest_id: document.guest_id,
    guest_name: document.guests?.full_name ?? "Unknown guest",
    camp_name: document.camps?.name ?? "Unknown camp",
    document_type: document.document_type,
    original_filename: document.original_filename,
    mime_type: document.mime_type,
    size_bytes: document.size_bytes,
    status: document.status,
    created_at: document.created_at,
  }));
}