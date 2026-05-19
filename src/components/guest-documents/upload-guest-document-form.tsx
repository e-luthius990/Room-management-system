import { uploadGuestDocumentAction } from "@/lib/actions/guest-documents/upload-document";
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
      encType="multipart/form-data"
      className="surface-card p-5 sm:p-6"
    >
      <input type="hidden" name="guestId" value={guestId} />

      <div>
        <div className="page-kicker">Guest documents</div>

        <h2 className="mt-2 text-base font-semibold tracking-[-0.025em] text-foreground">
          Upload document
        </h2>

        <p className="mt-1 text-sm leading-6 text-muted">
          Uploaded documents are stored privately and sent for review.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <Select
          id="documentType"
          name="documentType"
          label="Document type"
          required
          defaultValue=""
          placeholder="Select document type"
          options={documentTypeOptions}
        />

        <div className="field-group">
          <label htmlFor="guestDocumentFile" className="field-label">
            File
          </label>

          <input
            id="guestDocumentFile"
            required
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="input file:mr-4 file:rounded-xl file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-foreground"
          />

          <p className="field-hint">
            Accepted formats: PDF, JPG, PNG, and WEBP. Maximum size: 10MB.
          </p>
        </div>

        <Textarea
          id="documentNotes"
          name="notes"
          label="Notes"
          rows={3}
          maxLength={500}
          placeholder="Optional upload note"
          className="resize-y"
        />
      </div>

      <div className="form-actions mt-6">
        <PendingSubmitButton pendingLabel="Uploading document..." fullWidth>
          Upload private document
        </PendingSubmitButton>
      </div>
    </form>
  );
}
