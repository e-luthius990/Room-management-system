// src/app/(app)/stays/[stayId]/page.tsx

import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { getStayDetail } from "@/lib/queries/stays/get-stay-detail";
import { CheckInForm } from "@/components/stays/check-in-form";
import { CheckOutForm } from "@/components/stays/check-out-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { StatusIndicator } from "@/components/ui/StatusIndicator";

type StayDetailPageProps = {
  params: Promise<{
    stayId: string;
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

  if (!Number.isFinite(date.getTime())) {
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

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the form and try again.",
    stay_not_found: "Stay record was not found.",
    stay_not_checkin_ready: "Only reserved stays can be checked in.",
    invalid_stay_status:
      "Only checked-in or occupied stays can be checked out.",
    room_not_ready: "The assigned room is not available for check-in.",
    room_not_found: "The assigned room could not be found.",
    invalid_room_status_transition:
      "The room could not be updated through this workflow.",
    guest_access_denied:
      "You do not have access to this guest record in this camp.",
    camp_access_denied: "You do not have access to this camp.",
    access_denied: "You do not have access to perform this action.",
    check_in_failed: "Check-in could not be completed.",
    check_out_failed: "Check-out could not be completed.",
  };

  return messages[error] ?? "The stay action could not be completed.";
}

function getStayStatusClass(status: string): string {
  switch (status) {
    case "occupied":
    case "checked_in":
      return "status-occupied";

    case "reserved":
      return "status-reserved";

    case "completed":
      return "status-vacant-ready";

    case "cancelled":
    case "no_show":
      return "status-muted";

    case "transferred":
      return "status-reserved";

    default:
      return "status-muted";
  }
}

function canCheckIn(status: string): boolean {
  return status === "reserved";
}

function canCheckOut(status: string): boolean {
  return status === "occupied" || status === "checked_in";
}

function canCreateFieldAbsence(status: string): boolean {
  return status === "occupied" || status === "checked_in";
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

export default async function StayDetailPage({
  params,
  searchParams,
}: StayDetailPageProps): Promise<React.JSX.Element> {
  await requirePermission("stays.view");

  const [{ stayId }, query] = await Promise.all([params, searchParams]);
  const { stay } = await getStayDetail(stayId);

  const errorMessage = getErrorMessage(query?.error);

  const showCheckIn = canCheckIn(stay.status);
  const showCheckOut = canCheckOut(stay.status);
  const showFieldAbsence = canCreateFieldAbsence(stay.status);
  const hasWorkflowAction = showCheckIn || showCheckOut || showFieldAbsence;

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Stay record</div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Room
                </div>

                <h1 className="mt-1 text-4xl font-semibold leading-none tracking-[-0.065em] text-foreground sm:text-5xl">
                  {stay.room_number}
                </h1>
              </div>

              <div className="min-w-0 pb-1">
                <div className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {stay.guest_name}
                </div>

                <p className="mt-1 text-sm leading-6 text-muted">
                  {stay.building_name} · {stay.camp_name}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {stay.reservation_id ? (
              <Link
                href={APP_ROUTES.reservations.detail(stay.reservation_id)}
                className="btn-secondary"
              >
                Reservation
              </Link>
            ) : null}

            <Link href={APP_ROUTES.stays.list} className="btn-secondary">
              Back to stays
            </Link>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <main className="min-w-0 space-y-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="metadata-item">
              <div className="metadata-label">Status</div>
              <div className="metadata-value">
                <StatusIndicator
                  compact
                  label={formatLabel(stay.status)}
                  statusClassName={getStayStatusClass(stay.status)}
                />
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Arrival</div>
              <div className="metadata-value">
                {formatDateTime(stay.expected_arrival_at)}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Departure</div>
              <div className="metadata-value">
                {formatDateTime(stay.expected_departure_at)}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Allocation</div>
              <div className="metadata-value">
                {formatLabel(stay.allocation_status)}
              </div>
            </div>
          </section>

          <Card variant="console">
            <CardHeader dense>
              <CardTitle className="text-sm">Stay details</CardTitle>
              <CardDescription className="text-xs leading-5">
                Guest, room, camp, expected dates, actual movement timestamps,
                and reception notes.
              </CardDescription>
            </CardHeader>

            <CardContent dense>
              <dl className="divide-y divide-border">
                <InfoRow label="Guest" value={stay.guest_name} />

                <InfoRow
                  label="Guest category"
                  value={formatLabel(stay.guest_category)}
                />

                <InfoRow label="Camp" value={stay.camp_name} />

                <InfoRow
                  label="Room"
                  value={`${stay.building_name} / Room ${stay.room_number}`}
                />

                <InfoRow
                  label="Allocation status"
                  value={formatLabel(stay.allocation_status)}
                />

                <InfoRow
                  label="Expected arrival"
                  value={formatDateTime(stay.expected_arrival_at)}
                />

                <InfoRow
                  label="Expected departure"
                  value={formatDateTime(stay.expected_departure_at)}
                />

                <InfoRow
                  label="Checked in"
                  value={formatDateTime(stay.checked_in_at)}
                />

                <InfoRow
                  label="Checked out"
                  value={formatDateTime(stay.checked_out_at)}
                />

                <InfoRow
                  label="Check-in notes"
                  value={
                    <span className="whitespace-pre-wrap text-foreground-soft">
                      {stay.checkin_notes ?? "No check-in notes."}
                    </span>
                  }
                />

                <InfoRow
                  label="Check-out notes"
                  value={
                    <span className="whitespace-pre-wrap text-foreground-soft">
                      {stay.checkout_notes ?? "No check-out notes."}
                    </span>
                  }
                />
              </dl>
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card variant="inspector">
            <CardHeader dense>
              <CardTitle className="text-sm">Stay actions</CardTitle>
              <CardDescription className="text-xs leading-5">
                Available workflow actions for this guest stay.
              </CardDescription>
            </CardHeader>

            <CardContent dense className="space-y-4">
              {showCheckIn ? <CheckInForm stayId={stay.id} /> : null}

              {showCheckOut ? <CheckOutForm stayId={stay.id} /> : null}

              {showFieldAbsence ? (
                <div className="border border-border bg-surface-2 p-3">
                  <p className="text-sm font-semibold text-foreground">
                    Field movement
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    Mark this occupant as away in field while keeping the room
                    occupied.
                  </p>

                  <Link
                    href={APP_ROUTES.stays.createFieldAbsence(stay.id)}
                    className="btn-secondary mt-3 w-full"
                  >
                    Mark field absence
                  </Link>
                </div>
              ) : null}

              {!hasWorkflowAction ? (
                <p className="text-sm leading-6 text-muted">
                  No stay workflow actions are available for this status.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
