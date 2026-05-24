import { checkOutStayAction } from "@/lib/actions/stays/check-out";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Textarea } from "@/components/ui/Textarea";

type CheckOutFormProps = {
  stayId: string;
};

export function CheckOutForm({ stayId }: CheckOutFormProps): React.JSX.Element {
  return (
    <form action={checkOutStayAction} className="space-y-3">
      <input type="hidden" name="stayId" value={stayId} />

      <Textarea
        id="check-out-notes"
        name="notes"
        label="Reception note"
        hint="Optional note saved on the completed stay."
        rows={3}
        maxLength={700}
        placeholder="Add checkout note, returned items, or handover detail..."
        className="min-h-24 resize-none"
      />

      <div className="alert alert-warning">
        Check-out completes the stay, closes the active allocation, and releases
        the room back to the room workflow.
      </div>

      <PendingSubmitButton pendingLabel="Checking out..." fullWidth>
        Confirm check-out
      </PendingSubmitButton>
    </form>
  );
}
