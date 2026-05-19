import { checkOutStayAction } from "@/lib/actions/stays/check-out";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Textarea } from "@/components/ui/Textarea";

type CheckOutFormProps = {
  stayId: string;
};

export function CheckOutForm({ stayId }: CheckOutFormProps): React.JSX.Element {
  return (
    <form action={checkOutStayAction} className="space-y-4">
      <input type="hidden" name="stayId" value={stayId} />

      <Textarea
        id="check-out-notes"
        name="notes"
        label="Check-out notes"
        hint="This note is saved on the stay record after check-out."
        rows={3}
        maxLength={700}
        placeholder="Optional front-desk note for this check-out..."
        className="min-h-28 resize-none"
      />

      <div className="alert alert-success">
        Checking out this guest will complete the stay, close the room
        allocation, and return the room to the normal room workflow.
      </div>

      <PendingSubmitButton pendingLabel="Checking out guest..." fullWidth>
        Check out guest
      </PendingSubmitButton>
    </form>
  );
}
