import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/require-permission";
import { hasCampAccess } from "@/lib/auth/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type DownloadRouteProps = {
  params: Promise<{
    documentId: string;
  }>;
};

type GuestDocumentDownloadRow = {
  id: string;
  guest_id: string;
  camp_id: string;
  storage_bucket: string;
  storage_path: string;
  status: string;
  original_filename: string | null;
  mime_type: string | null;
};

function redirectToGuests(request: Request): NextResponse {
  return NextResponse.redirect(new URL("/guests", request.url));
}

function redirectToGuest(
  request: Request,
  guestId: string,
  error: string,
): NextResponse {
  return NextResponse.redirect(
    new URL(
      `/guests/${encodeURIComponent(guestId)}?error=${error}`,
      request.url,
    ),
  );
}

function contentDispositionFilename(value: string | null): string {
  const clean =
    value
      ?.normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 120) ?? "";

  return clean || "guest-document";
}

export async function GET(
  request: Request,
  { params }: DownloadRouteProps,
): Promise<NextResponse> {
  const currentUser = await requirePermission("guest_documents.view");
  const { documentId } = await params;

  const supabase = await createServerSupabaseClient();

  const { data: document, error } = await supabase
    .from("guest_documents")
    .select(
      [
        "id",
        "guest_id",
        "camp_id",
        "storage_bucket",
        "storage_path",
        "status",
        "original_filename",
        "mime_type",
      ].join(","),
    )
    .eq("id", documentId)
    .is("archived_at", null)
    .is("deleted_at", null)
    .maybeSingle()
    .returns<GuestDocumentDownloadRow | null>();

  if (error || !document) {
    return redirectToGuests(request);
  }

  if (!hasCampAccess(currentUser, document.camp_id, "operator")) {
    return NextResponse.redirect(new URL("/access-pending", request.url));
  }

  const { error: accessLogError } = await supabase.rpc(
    "record_guest_document_access",
    {
      p_document_id: document.id,
      p_access_type: "view",
      p_reason: "guest_record_document_preview",
    },
  );

  if (accessLogError) {
    console.error("Failed to record guest document access:", {
      documentId: document.id,
      status: document.status,
      message: accessLogError.message,
    });
  }

  const admin = createSupabaseAdminClient();

  const { data: file, error: fileError } = await admin.storage
    .from(document.storage_bucket)
    .download(document.storage_path);

  if (fileError || !file) {
    console.error("Failed to load guest document file:", {
      documentId: document.id,
      storageBucket: document.storage_bucket,
      storagePath: document.storage_path,
      message: fileError?.message,
    });

    return redirectToGuest(
      request,
      document.guest_id,
      "document_download_failed",
    );
  }

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      "Content-Type":
        document.mime_type ?? file.type ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${contentDispositionFilename(
        document.original_filename,
      )}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
