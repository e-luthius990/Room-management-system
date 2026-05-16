import Link from "next/link";
import { UploadGuestDocumentForm } from "@/components/guest-documents/upload-guest-document-form";

export type GuestDocumentStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "active" // legacy only
  | "archived"
  | "deleted";

type GuestDocument = {
  id: string;
  document_type: string;
  status: GuestDocumentStatus;
  uploaded_at: string;
  original_filename: string | null;
};

type GuestDocumentsPanelProps = {
  guestId: string;
  documents: GuestDocument[];
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDocumentType(type: string): string {
  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStatus(status: GuestDocumentStatus): string {
  if (status === "active") {
    return "Legacy active";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusTextClass(status: GuestDocumentStatus): string {
  switch (status) {
    case "approved":
      return "text-emerald-700";
    case "rejected":
      return "text-red-700";
    case "pending_review":
      return "text-amber-700";
    case "archived":
    case "deleted":
      return "text-neutral-500";
    case "active":
      return "text-blue-700";
    default:
      return "text-neutral-600";
  }
}

export function GuestDocumentsPanel({
  guestId,
  documents,
}: GuestDocumentsPanelProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <UploadGuestDocumentForm guestId={guestId} />

      <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-base font-semibold text-neutral-950">
            Documents
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Uploaded guest documents and review status.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-6 text-sm text-neutral-500">
              No documents uploaded yet.
            </div>
          ) : (
            documents.map((document) => (
              <div
                key={document.id}
                className="rounded-2xl border border-neutral-200 px-4 py-3 text-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-neutral-950">
                      {formatDocumentType(document.document_type)}
                    </div>

                    {document.original_filename ? (
                      <div className="mt-1 max-w-xl truncate text-xs text-neutral-500">
                        {document.original_filename}
                      </div>
                    ) : null}
                  </div>

                  <div
                    className={`text-xs font-semibold ${getStatusTextClass(
                      document.status,
                    )}`}
                  >
                    {formatStatus(document.status)}
                  </div>
                </div>

                <div className="mt-2 text-xs text-neutral-500">
                  Uploaded {formatDate(document.uploaded_at)}
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                  <Link
                    href={`/guest-documents/${document.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-900 underline underline-offset-4"
                  >
                    Open private file
                  </Link>

                  <Link
                    href={`/guest-documents/${document.id}`}
                    className="text-neutral-900 underline underline-offset-4"
                  >
                    View details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
