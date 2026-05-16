// src/app/(app)/stays/[stayId]/page.tsx

import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
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

function formatDateTime(value: string | null): string {
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

function formatLabel(value: string | null): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
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

function getSuccessMessage(success?: string): string | null {
  if (success === "checked_in") {
    return "Guest checked in successfully.";
  }

  if (success === "checked_out") {
    return "Guest checked out successfully. The stay is completed.";
  }

  return null;
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

export default async function StayDetailPage({
  params,
  searchParams,
}: StayDetailPageProps): Promise<React.JSX.Element> {
  await requirePermission("stays.view");

  const [{ stayId }, query] = await Promise.all([params, searchParams]);

  const { stay } = await getStayDetail(stayId);

  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  const showCheckIn = canCheckIn(stay.status);
  const showCheckOut = canCheckOut(stay.status);
  const hasWorkflowAction = showCheckIn || showCheckOut;

  return (
    <div className="page-stack">
      <section className="surface-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="page-kicker">Stay record</div>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl">
              Stay · Room {stay.room_number}
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted">
              Guest stay details, check-in, check-out, and movement timestamps.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {stay.reservation_id ? (
              <Link
                href={`/reservations/${stay.reservation_id}`}
                className="btn-secondary"
              >
                Reservation
              </Link>
            ) : null}

            <Link href="/stays" className="btn-secondary">
              Back to stays
            </Link>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Card variant="card">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Stay details</CardTitle>
                <CardDescription>
                  Current guest, room, camp, expected dates, and actual movement
                  timestamps.
                </CardDescription>
              </div>

              <StatusIndicator
                label={formatLabel(stay.status)}
                statusClassName={getStayStatusClass(stay.status)}
              />
            </div>
          </CardHeader>

          <CardContent>
            <dl className="grid gap-5 md:grid-cols-2">
              <DetailItem label="Guest">{stay.guest_name}</DetailItem>

              <DetailItem label="Guest category">
                {formatLabel(stay.guest_category)}
              </DetailItem>

              <DetailItem label="Camp">{stay.camp_name}</DetailItem>

              <DetailItem label="Room">
                {stay.building_name} / Room {stay.room_number}
              </DetailItem>

              <DetailItem label="Allocation status">
                {formatLabel(stay.allocation_status)}
              </DetailItem>

              <DetailItem label="Expected arrival">
                {formatDateTime(stay.expected_arrival_at)}
              </DetailItem>

              <DetailItem label="Expected departure">
                {formatDateTime(stay.expected_departure_at)}
              </DetailItem>

              <DetailItem label="Checked in">
                {formatDateTime(stay.checked_in_at)}
              </DetailItem>

              <DetailItem label="Checked out">
                {formatDateTime(stay.checked_out_at)}
              </DetailItem>

              <DetailItem label="Check-in notes" wide>
                <span className="whitespace-pre-wrap text-foreground-soft">
                  {stay.checkin_notes ?? "No check-in notes."}
                </span>
              </DetailItem>

              <DetailItem label="Check-out notes" wide>
                <span className="whitespace-pre-wrap text-foreground-soft">
                  {stay.checkout_notes ?? "No check-out notes."}
                </span>
              </DetailItem>
            </dl>
          </CardContent>
        </Card>

        <aside>
          <Card variant="card">
            <CardHeader>
              <CardTitle>Workflow actions</CardTitle>
              <CardDescription>
                Check-in and check-out actions use protected database workflows.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {showCheckIn ? <CheckInForm stayId={stay.id} /> : null}

              {showCheckOut ? <CheckOutForm stayId={stay.id} /> : null}

              {!hasWorkflowAction ? (
                <p className="text-sm leading-6 text-muted">
                  No stay workflow actions are available for this status.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
