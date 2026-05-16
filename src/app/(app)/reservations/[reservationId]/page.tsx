import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getReservationDetail } from "@/lib/queries/reservations/get-reservation-detail";
import {
  cancelReservationAction,
  markReservationNoShowAction,
} from "@/lib/actions/reservations/cancel-reservation";
import { ReservationCheckInForm } from "@/components/stays/reservation-check-in-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Textarea } from "@/components/ui/Textarea";

type ReservationDetailPageProps = {
  params: Promise<{
    reservationId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatLabel(value: string | null): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reservationStatusClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "status-vacant-ready";

    case "pending":
      return "status-reserved";

    case "checked_in":
      return "status-occupied";

    case "cancelled":
    case "no_show":
      return "status-under-maintenance";

    case "expired":
      return "status-muted";

    default:
      return "status-muted";
  }
}

function canCancel(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

function canMarkNoShow(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

function canCheckInReservation(status: string): boolean {
  return status === "pending" || status === "confirmed";
}

function getErrorMessage(error?: string): string | null {
  if (!error) return null;

  const messages: Record<string, string> = {
    invalid_input: "Check the form and try again.",
    room_not_ready: "This room is not ready for check-in.",
    reservation_not_found: "Reservation not found.",
    invalid_reservation_status:
      "This reservation cannot move through that action now.",
    reason_required: "A cancellation reason is required.",
    access_denied: "You do not have access to perform this action.",
    check_in_failed: "Check-in could not be completed.",
    workflow_failed: "Reservation workflow action failed.",
  };

  return messages[error] ?? "The reservation action could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (!success) return null;

  const messages: Record<string, string> = {
    reservation_created: "Reservation created successfully.",
    reservation_cancelled: "Reservation cancelled successfully.",
    reservation_no_show: "Reservation marked as no-show.",
    reservation_checked_in: "Reservation checked in successfully.",
    check_in_completed: "Check-in completed successfully.",
  };

  return messages[success] ?? null;
}

function DetailItem({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}): React.JSX.Element {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <dt className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-6 text-foreground">
        {children}
      </dd>
    </div>
  );
}

export default async function ReservationDetailPage({
  params,
  searchParams,
}: ReservationDetailPageProps): Promise<React.JSX.Element> {
  await requirePermission("reservations.view");

  const { reservationId } = await params;
  const query = searchParams ? await searchParams : undefined;

  const reservation = await getReservationDetail(reservationId);

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  const checkInAllowed = canCheckInReservation(reservation.status);
  const cancelAllowed = canCancel(reservation.status);
  const noShowAllowed = canMarkNoShow(reservation.status);
  const hasWorkflowAction = checkInAllowed || cancelAllowed || noShowAllowed;

  return (
    <div className="page-stack">
      <PageHeader
        title={`Reservation · Room ${reservation.room_number}`}
        description="Reservation details, expected arrival and departure, room hold status, check-in, cancellation, and no-show controls."
        actions={
          <Link href="/reservations" className="btn-secondary">
            Back to reservations
          </Link>
        }
      />

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Card variant="card">
          <CardHeader>
            <CardTitle>Reservation details</CardTitle>
            <CardDescription>
              Guest, room, schedule, and reservation status.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <dl className="grid gap-5 md:grid-cols-2">
              <DetailItem label="Guest">
                {reservation.guest_name ?? "Guest not assigned"}
              </DetailItem>

              <DetailItem label="Guest category">
                {formatLabel(reservation.guest_category)}
              </DetailItem>

              <DetailItem label="Camp">{reservation.camp_name}</DetailItem>

              <DetailItem label="Room">
                {reservation.building_name} / Room {reservation.room_number}
              </DetailItem>

              <DetailItem label="Expected arrival">
                {formatDateTime(reservation.expected_arrival_at)}
              </DetailItem>

              <DetailItem label="Expected departure">
                {formatDateTime(reservation.expected_departure_at)}
              </DetailItem>

              <DetailItem label="Status">
                <StatusIndicator
                  label={formatLabel(reservation.status)}
                  statusClassName={reservationStatusClass(reservation.status)}
                />
              </DetailItem>

              <DetailItem label="VIP hold">
                {reservation.is_vip_hold ? "Yes" : "No"}
              </DetailItem>

              {reservation.group_id ? (
                <DetailItem label="Group">Group reservation</DetailItem>
              ) : null}

              <DetailItem label="Notes" wide>
                <span className="whitespace-pre-wrap text-foreground-soft">
                  {reservation.notes ?? "No notes."}
                </span>
              </DetailItem>

              <DetailItem label="Created">
                {formatDateTime(reservation.created_at)}
              </DetailItem>
            </dl>
          </CardContent>
        </Card>

        <aside className="space-y-5">
          <Card variant="card">
            <CardHeader>
              <CardTitle>Workflow actions</CardTitle>
              <CardDescription>
                Actions available for the current reservation status.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {checkInAllowed ? (
                <div className="rounded-2xl border border-border bg-surface-2 p-4">
                  <div className="mb-4 text-sm font-semibold text-foreground">
                    Check in this reservation
                  </div>

                  <ReservationCheckInForm reservationId={reservation.id} />
                </div>
              ) : null}

              {cancelAllowed ? (
                <form action={cancelReservationAction} className="space-y-3">
                  <input
                    type="hidden"
                    name="reservationId"
                    value={reservation.id}
                  />

                  <Textarea
                    id="cancellationReason"
                    name="reason"
                    label="Cancellation reason"
                    required
                    rows={3}
                    minLength={3}
                    maxLength={500}
                    placeholder="Why is this reservation being cancelled?"
                  />

                  <button type="submit" className="btn-danger w-full">
                    Cancel reservation
                  </button>
                </form>
              ) : null}

              {noShowAllowed ? (
                <form
                  action={markReservationNoShowAction}
                  className="space-y-3"
                >
                  <input
                    type="hidden"
                    name="reservationId"
                    value={reservation.id}
                  />

                  <Textarea
                    id="noShowReason"
                    name="reason"
                    label="No-show note"
                    rows={3}
                    maxLength={500}
                    placeholder="Optional note"
                  />

                  <button type="submit" className="btn-secondary w-full">
                    Mark no-show
                  </button>
                </form>
              ) : null}

              {!hasWorkflowAction ? (
                <p className="text-sm leading-6 text-muted">
                  No reservation workflow actions are available for this status.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {reservation.cancellation_reason ? (
            <div className="alert alert-danger">
              <div className="alert-title">Cancellation</div>

              <div className="whitespace-pre-wrap leading-6">
                {reservation.cancellation_reason}
              </div>

              <div className="mt-3 text-xs">
                {formatDateTime(reservation.cancelled_at)}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
