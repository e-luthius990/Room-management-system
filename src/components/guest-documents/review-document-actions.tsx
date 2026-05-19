import { reviewGuestDocumentAction } from "@/lib/actions/guest-documents/review-document";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Textarea } from "@/components/ui/Textarea";

export type GuestDocumentReviewStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "active"
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
      <div className="alert alert-info">
        <p className="text-sm leading-6">{getReviewedMessage(status)}</p>
      </div>
    );
  }

  return (
    <form action={reviewGuestDocumentAction} className="space-y-4">
      <input type="hidden" name="documentId" value={documentId} />

      <Textarea
        id="reviewNotes"
        name="reviewNotes"
        label="Review notes"
        rows={4}
        maxLength={1000}
        placeholder="Required when rejecting. Recommended for all reviews."
        className="resize-y"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <PendingSubmitButton
          name="status"
          value="rejected"
          pendingLabel="Rejecting document..."
          className="btn-danger min-h-11 rounded-2xl px-4 py-3"
        >
          Reject document
        </PendingSubmitButton>

        <PendingSubmitButton
          name="status"
          value="approved"
          pendingLabel="Approving document..."
          className="min-h-11 rounded-2xl px-4 py-3"
        >
          Approve document
        </PendingSubmitButton>
      </div>
    </form>
  );
}
