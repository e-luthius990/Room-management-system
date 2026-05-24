import { checkInReservationAction } from "@/lib/actions/stays/check-in";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { Textarea } from "@/components/ui/Textarea";

type ReservationCheckInFormProps = {
  reservationId: string;
};

export function ReservationCheckInForm({
  reservationId,
}: ReservationCheckInFormProps): React.JSX.Element {
  return (
    <form action={checkInReservationAction} className="space-y-3">
      <input type="hidden" name="reservationId" value={reservationId} />

      <Textarea
        id="reservation-check-in-notes"
        name="notes"
        label="Reception note"
        hint="Optional note saved on the new stay record."
        rows={3}
        maxLength={700}
        placeholder="Add arrival condition, handover note, or reception detail..."
        className="min-h-24 resize-none"
      />

      <PendingSubmitButton pendingLabel="Checking in..." fullWidth>
        Confirm check-in
      </PendingSubmitButton>
    </form>
  );
}
