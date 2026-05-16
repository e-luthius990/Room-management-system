import { reviewGuestDocumentAction } from "@/lib/actions/guest-documents/review-document";

export type GuestDocumentReviewStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "active" // legacy only
  | "archived"
  | "deleted";

type ReviewDocumentActionsProps = {
  documentId: string;
  status: GuestDocumentReviewStatus;
};

function getReviewedMessage(status: GuestDocumentReviewStatus): string {
  switch (status) {
    case "approved":
      return "This document has already been approved.";
    case "rejected":
      return "This document has already been rejected.";
    case "active":
      return "This document uses the old active status. Migrate it to pending review before reviewing.";
    case "archived":
      return "This document has been archived and can no longer be reviewed.";
    case "deleted":
      return "This document has been deleted and can no longer be reviewed.";
    default:
      return "This document is not available for review.";
  }
}

export function ReviewDocumentActions({
  documentId,
  status,
}: ReviewDocumentActionsProps): React.JSX.Element {
  if (status !== "pending_review") {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
        <p className="text-sm leading-6 text-neutral-600">
          {getReviewedMessage(status)}
        </p>
      </div>
    );
  }

  return (
    <form action={reviewGuestDocumentAction} className="space-y-4">
      <input type="hidden" name="documentId" value={documentId} />

      <div>
        <label
          htmlFor="reviewNotes"
          className="mb-2 block text-sm font-medium text-neutral-800"
        >
          Review notes
        </label>

        <textarea
          id="reviewNotes"
          name="reviewNotes"
          rows={4}
          className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none transition focus:border-neutral-400"
          placeholder="Required when rejecting. Recommended for all reviews."
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="submit"
          name="status"
          value="rejected"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
        >
          Reject document
        </button>

        <button
          type="submit"
          name="status"
          value="approved"
          className="rounded-2xl bg-neutral-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
        >
          Approve document
        </button>
      </div>
    </form>
  );
}
