import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
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

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
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
  if (!error) {
    return null;
  }

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
  if (!success) {
    return null;
  }

  const messages: Record<string, string> = {
    reservation_cancelled: "Reservation cancelled successfully.",
    reservation_no_show: "Reservation marked as no-show.",
    reservation_checked_in: "Reservation checked in successfully.",
    check_in_completed: "Check-in completed successfully.",
  };

  return messages[success] ?? null;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)]">
      <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm font-semibold leading-6 text-foreground">
        {value}
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

  if (!reservation) {
    notFound();
  }

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  const checkInAllowed = canCheckInReservation(reservation.status);
  const cancelAllowed = canCancel(reservation.status);
  const noShowAllowed = canMarkNoShow(reservation.status);
  const hasWorkflowAction = checkInAllowed || cancelAllowed || noShowAllowed;

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Reception reservation detail</div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Room
                </div>

                <h1 className="mt-1 text-4xl font-semibold leading-none tracking-[-0.065em] text-foreground sm:text-5xl">
                  {reservation.room_number}
                </h1>
              </div>

              <div className="min-w-0 pb-1">
                <div className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {reservation.guest_name ?? "Guest not assigned"}
                </div>

                <p className="mt-1 text-sm leading-6 text-muted">
                  {reservation.building_name} · {reservation.camp_name}
                </p>
              </div>
            </div>
          </div>

          <Link href={APP_ROUTES.reservations.list} className="btn-secondary">
            Back to reservations
          </Link>
        </div>
      </section>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <main className="min-w-0 space-y-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="metadata-item">
              <div className="metadata-label">Status</div>
              <div className="metadata-value">
                <StatusIndicator
                  compact
                  label={formatLabel(reservation.status)}
                  statusClassName={reservationStatusClass(reservation.status)}
                />
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Arrival</div>
              <div className="metadata-value">
                {formatDateTime(reservation.expected_arrival_at)}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Departure</div>
              <div className="metadata-value">
                {formatDateTime(reservation.expected_departure_at)}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">VIP hold</div>
              <div className="metadata-value">
                {reservation.is_vip_hold ? "Yes" : "No"}
              </div>
            </div>
          </section>

          <Card variant="console">
            <CardHeader dense>
              <CardTitle className="text-sm">Reservation record</CardTitle>
              <CardDescription className="text-xs leading-5">
                Guest, room, schedule, and reservation notes.
              </CardDescription>
            </CardHeader>

            <CardContent dense>
              <dl className="divide-y divide-border">
                <InfoRow
                  label="Guest"
                  value={reservation.guest_name ?? "Guest not assigned"}
                />

                <InfoRow
                  label="Guest category"
                  value={formatLabel(reservation.guest_category)}
                />

                <InfoRow label="Camp" value={reservation.camp_name} />

                <InfoRow
                  label="Room"
                  value={`${reservation.building_name} / Room ${reservation.room_number}`}
                />

                <InfoRow
                  label="Expected arrival"
                  value={formatDateTime(reservation.expected_arrival_at)}
                />

                <InfoRow
                  label="Expected departure"
                  value={formatDateTime(reservation.expected_departure_at)}
                />

                <InfoRow
                  label="Status"
                  value={
                    <StatusIndicator
                      compact
                      label={formatLabel(reservation.status)}
                      statusClassName={reservationStatusClass(
                        reservation.status,
                      )}
                    />
                  }
                />

                <InfoRow
                  label="VIP hold"
                  value={reservation.is_vip_hold ? "Yes" : "No"}
                />

                {reservation.group_id ? (
                  <InfoRow label="Group" value="Group reservation" />
                ) : null}

                <InfoRow
                  label="Notes"
                  value={
                    <span className="whitespace-pre-wrap text-foreground-soft">
                      {reservation.notes ?? "No notes."}
                    </span>
                  }
                />

                <InfoRow
                  label="Created"
                  value={formatDateTime(reservation.created_at)}
                />
              </dl>
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card variant="inspector">
            <CardHeader dense>
              <CardTitle className="text-sm">Reservation actions</CardTitle>
              <CardDescription className="text-xs leading-5">
                Available workflow actions for this room hold.
              </CardDescription>
            </CardHeader>

            <CardContent dense className="space-y-4">
              {checkInAllowed ? (
                <div className="border border-border bg-surface-2 p-3">
                  <div className="mb-3 text-sm font-semibold text-foreground">
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
      </section>
    </div>
  );
}
