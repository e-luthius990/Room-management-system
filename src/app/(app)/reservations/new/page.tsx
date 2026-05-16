import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { ReservationForm } from "@/components/reservations/reservation-form";
import {
  getReservationGuestOptions,
  getReservationRoomOptions,
} from "@/lib/queries/reservations/options";
import { Card, CardContent } from "@/components/ui/Card";

type NewReservationPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string): string | null {
  if (!error) return null;

  const messages: Record<string, string> = {
    invalid_input: "Check the form and try again.",
    room_unavailable:
      "This room already has a reservation or stay during the selected dates.",
    room_has_maintenance: "This room has an open blocking maintenance issue.",
    access_denied: "You do not have access to this camp, room, or guest.",
    invalid_dates: "Expected departure must be after expected arrival.",
    guest_not_found: "Selected guest was not found.",
    room_not_found: "Selected room was not found.",
    create_failed: "Reservation could not be created.",
  };

  return messages[error] ?? "Reservation could not be created.";
}

export default async function NewReservationPage({
  searchParams,
}: NewReservationPageProps): Promise<React.JSX.Element> {
  await requirePermission("reservations.create");

  const params = searchParams ? await searchParams : undefined;

  const [guests, rooms] = await Promise.all([
    getReservationGuestOptions(),
    getReservationRoomOptions(),
  ]);

  const errorMessage = getErrorMessage(params?.error);

  return (
    <div className="page-stack">
      <PageHeader
        title="New reservation"
        description="Create a future reservation or same-day room hold. The database prevents overlapping reservations and unsafe room use."
        actions={
          <Link href="/reservations" className="btn-secondary">
            Back to reservations
          </Link>
        }
      />

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {guests.length === 0 ? (
        <div className="alert alert-warning">
          No active guests are available. Create or restore a guest record
          before creating a reservation.
        </div>
      ) : rooms.length === 0 ? (
        <div className="alert alert-warning">
          No reservable rooms are available. Rooms under maintenance, out of
          service, or on manager hold are excluded.
        </div>
      ) : (
        <Card variant="card">
          <CardContent>
            <ReservationForm guests={guests} rooms={rooms} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
