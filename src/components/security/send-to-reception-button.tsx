import { sendGuestToReceptionAction } from "@/lib/actions/security/create-clearance-event";
import { Button } from "@/components/ui/Button";

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

      <Button
        type="submit"
        disabled={disabled}
        size={compact ? "sm" : "md"}
        className={compact ? undefined : "w-full"}
      >
        Send to reception
      </Button>
    </form>
  );
}
