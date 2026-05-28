import { uploadGuestDocumentAction } from "@/lib/actions/guest-documents/upload-document";
import { DocumentFileInput } from "@/components/guest-documents/document-file-input";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type UploadGuestDocumentFormProps = {
  guestId: string;
};

const documentTypeOptions = [
  { value: "passport", label: "Passport" },
  { value: "national_id", label: "National ID" },
  { value: "visa", label: "Visa" },
  { value: "work_permit", label: "Work permit" },
  { value: "invitation_letter", label: "Invitation letter" },
  { value: "security_clearance", label: "Security clearance" },
  { value: "other", label: "Other" },
] as const;

export function UploadGuestDocumentForm({
  guestId,
}: UploadGuestDocumentFormProps): React.JSX.Element {
  return (
    <form
      action={uploadGuestDocumentAction}
      className="surface-card overflow-hidden p-0"
    >
      <input type="hidden" name="guestId" value={guestId} />

      <div className="border-b border-border bg-surface px-4 py-4 sm:px-5">
        <h2 className="text-sm font-semibold text-foreground">
          Upload document
        </h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Store private identity and clearance files on this guest record.
        </p>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <Select
          id="documentType"
          name="documentType"
          label="Document type"
          required
          defaultValue=""
          placeholder="Select document type"
          options={documentTypeOptions}
        />

        <DocumentFileInput />

        <Textarea
          id="documentNotes"
          name="notes"
          label="Upload note"
          rows={3}
          maxLength={500}
          placeholder="Optional context for this document"
          className="resize-y"
        />
      </div>

      <div className="form-actions mx-4 mb-4 sm:mx-5">
        <PendingSubmitButton pendingLabel="Uploading document..." fullWidth>
          Upload private document
        </PendingSubmitButton>
      </div>
    </form>
  );
}
