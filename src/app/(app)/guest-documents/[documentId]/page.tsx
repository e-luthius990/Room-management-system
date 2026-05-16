import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getGuestDocumentDetail } from "@/lib/queries/guest-documents/get-guest-document-detail";
import { ReviewDocumentActions } from "@/components/guest-documents/review-document-actions";

type GuestDocumentDetailPageProps = {
  params: Promise<{
    documentId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(value: number | null): string {
  if (value === null || value < 0) return "—";

  if (value === 0) return "0 KB";

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getErrorMessage(error?: string): string | null {
  if (!error) return null;

  const messages: Record<string, string> = {
    invalid_input: "Check the form and try again.",
    document_not_found: "Guest document not found.",
    review_note_required:
      "Review notes are required when rejecting a document.",
    invalid_review_status: "Choose a valid review decision.",
    document_not_pending_review:
      "Only documents still pending review can be approved or rejected.",
    document_download_failed: "Secure document link could not be created.",
    access_denied: "You do not have access to perform this action.",
    review_failed: "Document review could not be completed.",
  };

  return messages[error] ?? "The request could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  const messages: Record<string, string> = {
    document_reviewed: "Document review saved successfully.",
  };

  return success ? (messages[success] ?? null) : null;
}

export default async function GuestDocumentDetailPage({
  params,
  searchParams,
}: GuestDocumentDetailPageProps): Promise<React.JSX.Element> {
  await requirePermission("guest_documents.view");

  const { documentId } = await params;
  const query = searchParams ? await searchParams : undefined;

  const document = await getGuestDocumentDetail(documentId);

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  return (
    <div>
      <PageHeader
        title={`${formatLabel(document.document_type)} · ${document.guest_name}`}
        description="Private guest document metadata, secure file access, and review decision."
        actions={
          <Link
            href="/guest-documents/review"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
          >
            Back to review queue
          </Link>
        }
      />

      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-neutral-950">
            Document details
          </h2>

          <dl className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <dt className="text-sm text-neutral-500">Guest</dt>
              <dd className="mt-1">
                <Link
                  href={`/guests/${document.guest_id}`}
                  className="font-medium text-neutral-950 underline underline-offset-4"
                >
                  {document.guest_name}
                </Link>
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Camp</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {document.camp_name}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Document type</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {formatLabel(document.document_type)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Status</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {formatLabel(document.status)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Filename</dt>
              <dd className="mt-1 break-words font-medium text-neutral-950">
                {document.original_filename ?? "Private file"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">File size</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {formatBytes(document.size_bytes)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">MIME type</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {document.mime_type ?? "—"}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Uploaded</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {formatDate(document.uploaded_at)}
              </dd>
            </div>

            <div>
              <dt className="text-sm text-neutral-500">Reviewed</dt>
              <dd className="mt-1 font-medium text-neutral-950">
                {formatDate(document.reviewed_at)}
              </dd>
            </div>

            <div className="md:col-span-2">
              <dt className="text-sm text-neutral-500">Upload notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-800">
                {document.notes ?? "No upload notes."}
              </dd>
            </div>

            <div className="md:col-span-2">
              <dt className="text-sm text-neutral-500">Review notes</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-neutral-800">
                {document.review_notes ?? "No review notes."}
              </dd>
            </div>
          </dl>

          <div className="mt-8">
            <Link
              href={`/guest-documents/${document.id}/download`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Open private file
            </Link>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-950">
              Review decision
            </h2>

            <div className="mt-5">
              <ReviewDocumentActions
                documentId={document.id}
                status={document.status}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
