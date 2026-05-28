import { markSecurityGateExitAction } from "@/lib/actions/security/create-clearance-event";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Textarea } from "@/components/ui/Textarea";

type GateExitFormProps = {
  securityEventId: string;
  guestName: string;
  entryAt?: string | null;
  compact?: boolean;
};

export function GateExitForm({
  securityEventId,
  compact = false,
}: GateExitFormProps): React.JSX.Element {
  if (compact) {
    return (
      <form action={markSecurityGateExitAction} className="inline-flex">
        <input type="hidden" name="securityEventId" value={securityEventId} />
        <input type="hidden" name="exitNotes" value="" />

        <PendingSubmitButton
          pendingLabel="Marking as left..."
          className="btn-warning btn-sm"
        >
          Mark as left
        </PendingSubmitButton>
      </form>
    );
  }

  return (
    <form action={markSecurityGateExitAction} className="space-y-3">
      <input type="hidden" name="securityEventId" value={securityEventId} />

      <Textarea
        id={`exit-notes-${securityEventId}`}
        name="exitNotes"
        label="Exit notes"
        rows={3}
        maxLength={1000}
        placeholder="Optional. Example: Left with company transport, visitor badge returned..."
        className="resize-y"
      />

      <PendingSubmitButton
        pendingLabel="Marking as left..."
        fullWidth
        className="btn-warning"
      >
        Mark as left
      </PendingSubmitButton>
    </form>
  );
}
