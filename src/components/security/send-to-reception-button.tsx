import { sendGuestToReceptionAction } from "@/lib/actions/security/create-clearance-event";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { cn } from "@/lib/utils/cn";

type SendToReceptionButtonProps = {
  securityEventId: string | null | undefined;
  disabled?: boolean;
  compact?: boolean;
  notes?: string | null;
  className?: string;
};

export function SendToReceptionButton({
  securityEventId,
  disabled = false,
  compact = false,
  notes = null,
  className,
}: SendToReceptionButtonProps): React.JSX.Element {
  const normalizedSecurityEventId = securityEventId?.trim() ?? "";
  const normalizedNotes = notes?.trim() ?? "";
  const isDisabled = disabled || normalizedSecurityEventId.length === 0;

  return (
    <form
      action={sendGuestToReceptionAction}
      className={cn(compact ? "w-full" : undefined, className)}
    >
      <input
        type="hidden"
        name="securityEventId"
        value={normalizedSecurityEventId}
      />

      {normalizedNotes.length > 0 ? (
        <input type="hidden" name="notes" value={normalizedNotes} />
      ) : null}

      <PendingSubmitButton
        disabled={isDisabled}
        pendingLabel={compact ? "Sending..." : "Sending to reception..."}
        fullWidth
        size={compact ? "sm" : "md"}
        variant="secondary"
      >
        {compact ? "Send reception" : "Send to reception"}
      </PendingSubmitButton>
    </form>
  );
}
