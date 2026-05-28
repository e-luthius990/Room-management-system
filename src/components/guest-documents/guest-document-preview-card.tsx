"use client";

import * as React from "react";
import Image from "next/image";
import { ExternalLink, FileText, Maximize2, X } from "lucide-react";

export type GuestDocumentPreviewStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "active"
  | "archived"
  | "deleted";

export type GuestDocumentPreviewItem = {
  id: string;
  document_type: string;
  status: GuestDocumentPreviewStatus;
  uploaded_at: string;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  notes: string | null;
};

type GuestDocumentPreviewCardProps = {
  document: GuestDocumentPreviewItem;
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

function formatStatus(status: GuestDocumentPreviewStatus): string {
  if (status === "active") {
    return "Available";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatBytes(value: number | null): string {
  if (value === null || value < 0) {
    return "Unknown size";
  }

  if (value === 0) {
    return "0 KB";
  }

  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function getFileTypeLabel(mimeType: string | null): string {
  switch (mimeType) {
    case "application/pdf":
      return "PDF";
    case "image/jpeg":
      return "JPG";
    case "image/png":
      return "PNG";
    case "image/webp":
      return "WebP";
    default:
      return "File";
  }
}

function isImage(mimeType: string | null): boolean {
  return (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp"
  );
}

function canPreview(status: GuestDocumentPreviewStatus): boolean {
  return (
    status === "active" ||
    status === "approved" ||
    status === "pending_review"
  );
}

export function GuestDocumentPreviewCard({
  document,
}: GuestDocumentPreviewCardProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const documentUrl = `/guest-documents/${document.id}/download`;
  const title =
    document.original_filename?.trim() ||
    formatDocumentType(document.document_type);
  const previewable = canPreview(document.status);
  const imageDocument = isImage(document.mime_type);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <div className="border border-border bg-surface-raised px-4 py-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
          <button
            type="button"
            disabled={!previewable}
            onClick={() => setOpen(true)}
            className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden border border-border bg-surface text-left disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={`Preview ${title}`}
          >
            {imageDocument && previewable ? (
              <Image
                src={documentUrl}
                alt={title}
                fill
                sizes="120px"
                unoptimized
                className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              />
            ) : (
              <FileText aria-hidden="true" className="size-8 text-muted" />
            )}

            {previewable ? (
              <span className="absolute bottom-2 right-2 inline-flex size-7 items-center justify-center bg-surface/95 text-foreground shadow-sm">
                <Maximize2 aria-hidden="true" className="size-3.5" />
              </span>
            ) : null}
          </button>

          <div className="min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="truncate font-semibold text-foreground">
                  {title}
                </div>

                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                  <span>{formatDocumentType(document.document_type)}</span>
                  <span>{getFileTypeLabel(document.mime_type)}</span>
                  <span>{formatBytes(document.size_bytes)}</span>
                  <span>Uploaded {formatDate(document.uploaded_at)}</span>
                </div>
              </div>

              {previewable ? (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="btn-secondary btn-sm shrink-0"
                >
                  <Maximize2 aria-hidden="true" className="size-3.5" />
                  Preview
                </button>
              ) : (
                <span className="shrink-0 text-xs font-semibold text-muted">
                  {formatStatus(document.status)}
                </span>
              )}
            </div>

            {document.notes?.trim() ? (
              <p className="mt-3 border-t border-border pt-3 text-sm leading-6 text-muted">
                {document.notes}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden border border-border bg-surface shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">
                  {title}
                </div>
                <div className="truncate text-xs text-muted">
                  {formatDocumentType(document.document_type)}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary btn-sm"
                >
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                  Open
                </a>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary btn-sm"
                  aria-label="Close preview"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-surface-2 p-3">
              {imageDocument ? (
                <div className="relative h-full min-h-[28rem] w-full">
                  <Image
                    src={documentUrl}
                    alt={title}
                    fill
                    sizes="100vw"
                    unoptimized
                    className="object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={documentUrl}
                  title={title}
                  className="h-full min-h-[28rem] w-full border border-border bg-surface"
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
