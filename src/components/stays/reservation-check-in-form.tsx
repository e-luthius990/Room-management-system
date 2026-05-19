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
    <form action={checkInReservationAction} className="space-y-4">
      <input type="hidden" name="reservationId" value={reservationId} />

      <Textarea
        id="reservation-check-in-notes"
        name="notes"
        label="Check-in notes"
        hint="This note is saved on the stay record after the reservation is checked in."
        rows={3}
        maxLength={700}
        placeholder="Optional front-desk note for this reservation check-in..."
        className="min-h-28 resize-none"
      />

      <PendingSubmitButton pendingLabel="Checking in reservation..." fullWidth>
        Check in reservation
      </PendingSubmitButton>
    </form>
  );
}
