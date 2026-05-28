import {
  GuestDocumentPreviewCard,
  type GuestDocumentPreviewItem,
} from "@/components/guest-documents/guest-document-preview-card";
import { UploadGuestDocumentForm } from "@/components/guest-documents/upload-guest-document-form";

type GuestDocumentsPanelProps = {
  guestId: string;
  documents: GuestDocumentPreviewItem[];
};

export function GuestDocumentsPanel({
  guestId,
  documents,
}: GuestDocumentsPanelProps): React.JSX.Element {
  return (
    <div className="space-y-6">
      <UploadGuestDocumentForm guestId={guestId} />

      <section className="surface-card overflow-hidden">
        <div className="border-b border-border bg-surface px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">Documents</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Private files attached to this guest record.
          </p>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {documents.length === 0 ? (
            <div className="border border-dashed border-border bg-surface-2 px-4 py-6 text-sm text-muted">
              No documents uploaded yet.
            </div>
          ) : (
            documents.map((document) => (
              <GuestDocumentPreviewCard
                key={document.id}
                document={document}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
