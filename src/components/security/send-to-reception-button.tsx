import { sendGuestToReceptionAction } from "@/lib/actions/security/create-clearance-event";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";

type SendToReceptionButtonProps = {
  securityEventId: string;
  disabled?: boolean;
  compact?: boolean;
};

export function SendToReceptionButton({
  securityEventId,
  disabled = false,
  compact = false,
}: SendToReceptionButtonProps): React.JSX.Element {
  return (
    <form action={sendGuestToReceptionAction}>
      <input type="hidden" name="securityEventId" value={securityEventId} />

      <PendingSubmitButton
        disabled={disabled}
        pendingLabel="Sending to reception..."
        fullWidth={!compact}
        className={compact ? "btn-sm" : undefined}
      >
        Send to reception
      </PendingSubmitButton>
    </form>
  );
}
