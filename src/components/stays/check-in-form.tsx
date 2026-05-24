import { checkInStayAction } from "@/lib/actions/stays/check-in";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Textarea } from "@/components/ui/Textarea";

type CheckInFormProps = {
  stayId: string;
};

export function CheckInForm({ stayId }: CheckInFormProps): React.JSX.Element {
  return (
    <form action={checkInStayAction} className="space-y-3">
      <input type="hidden" name="stayId" value={stayId} />

      <Textarea
        id="check-in-notes"
        name="notes"
        label="Reception note"
        hint="Optional note saved on the stay record."
        rows={3}
        maxLength={700}
        placeholder="Add anything reception should remember for this stay..."
        className="min-h-24 resize-none"
      />

      <PendingSubmitButton pendingLabel="Checking in..." fullWidth>
        Confirm check-in
      </PendingSubmitButton>
    </form>
  );
}
