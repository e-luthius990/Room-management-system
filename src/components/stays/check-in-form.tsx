import { checkInStayAction } from "@/lib/actions/stays/check-in";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

type CheckInFormProps = {
  stayId: string;
};

export function CheckInForm({ stayId }: CheckInFormProps): React.JSX.Element {
  return (
    <form action={checkInStayAction} className="space-y-4">
      <input type="hidden" name="stayId" value={stayId} />

      <Textarea
        id="check-in-notes"
        name="notes"
        label="Check-in notes"
        hint="This note is saved on the stay record after check-in."
        rows={3}
        maxLength={700}
        placeholder="Optional front-desk note for this stay..."
        className="min-h-28 resize-none"
      />

      <Button type="submit" className="w-full">
        Check in guest
      </Button>
    </form>
  );
}
