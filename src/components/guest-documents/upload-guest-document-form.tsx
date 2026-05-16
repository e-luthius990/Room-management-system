import { uploadGuestDocumentAction } from "@/lib/actions/guest-documents/upload-document";

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
      className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="guestId" value={guestId} />

      <div>
        <h2 className="text-base font-semibold text-neutral-950">
          Upload document
        </h2>
        <p className="mt-1 text-sm leading-6 text-neutral-500">
          Uploaded documents are stored privately and sent for review.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="documentType"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Document type
          </label>

          <select
            id="documentType"
            required
            name="documentType"
            defaultValue=""
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          >
            <option value="" disabled>
              Select document type
            </option>

            {documentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="guestDocumentFile"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            File
          </label>

          <input
            id="guestDocumentFile"
            required
            name="file"
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-neutral-800"
          />

          <p className="mt-2 text-xs leading-5 text-neutral-500">
            Accepted formats: PDF, JPG, PNG, and WEBP. Maximum size: 10MB.
          </p>
        </div>

        <div>
          <label
            htmlFor="documentNotes"
            className="mb-2 block text-sm font-medium text-neutral-800"
          >
            Notes
          </label>

          <textarea
            id="documentNotes"
            name="notes"
            rows={3}
            maxLength={500}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
            placeholder="Optional upload note"
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-5 w-full rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
      >
        Upload private document
      </button>
    </form>
  );
}
