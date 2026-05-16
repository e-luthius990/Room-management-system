import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { hasCampAccess } from "@/lib/auth/permissions";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DownloadRouteProps = {
  params: Promise<{
    documentId: string;
  }>;
};

type GuestDocumentDownloadRow = {
  id: string;
  camp_id: string;
  storage_bucket: string;
  storage_path: string;
};

function redirectToReview(request: Request): NextResponse {
  return NextResponse.redirect(new URL("/guest-documents/review", request.url));
}

function redirectToDocument(
  request: Request,
  documentId: string,
  error: string,
): NextResponse {
  return NextResponse.redirect(
    new URL(
      `/guest-documents/${encodeURIComponent(documentId)}?error=${error}`,
      request.url,
    ),
  );
}

export async function GET(
  request: Request,
  { params }: DownloadRouteProps,
): Promise<NextResponse> {
  const currentUser = await requirePermission("guest_documents.download");
  const { documentId } = await params;

  const supabase = await createServerSupabaseClient();

  const { data: document, error } = await supabase
    .from("guest_documents")
    .select("id,camp_id,storage_bucket,storage_path")
    .eq("id", documentId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()
    .returns<GuestDocumentDownloadRow | null>();

  if (error || !document) {
    return redirectToReview(request);
  }

  if (!hasCampAccess(currentUser, document.camp_id, "operator")) {
    return NextResponse.redirect(new URL("/access-pending", request.url));
  }

  const { error: accessLogError } = await supabase.rpc(
    "record_guest_document_access",
    {
      p_document_id: document.id,
      p_access_type: "download",
      p_reason: "secure_download_route",
    },
  );

  if (accessLogError) {
    return redirectToDocument(
      request,
      document.id,
      "document_download_failed",
    );
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(document.storage_bucket)
    .createSignedUrl(document.storage_path, 60);

  if (signedUrlError || !data?.signedUrl) {
    return redirectToDocument(
      request,
      document.id,
      "document_download_failed",
    );
  }

  return NextResponse.redirect(data.signedUrl);
}