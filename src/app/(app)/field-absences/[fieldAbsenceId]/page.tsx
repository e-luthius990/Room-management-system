import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { getFieldAbsenceById } from "@/lib/queries/field-absences";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import {
  cancelFieldAbsenceAction,
  markFieldAbsenceReturnedAction,
} from "@/lib/actions/field-absences";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { Textarea } from "@/components/ui/Textarea";

type FieldAbsenceDetailPageProps = {
  params: Promise<{
    fieldAbsenceId: string;
  }>;
};

type FieldAbsenceStatus = "away" | "extended" | "returned" | "cancelled";

const STATUS_LABEL: Record<FieldAbsenceStatus, string> = {
  away: "Away",
  extended: "Extended",
  returned: "Returned",
  cancelled: "Cancelled",
};

function isFieldAbsenceStatus(
  value: string | null,
): value is FieldAbsenceStatus {
  return (
    value === "away" ||
    value === "extended" ||
    value === "returned" ||
    value === "cancelled"
  );
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatValue(value: string | number | null | undefined): string {
  if (typeof value === "number") {
    return String(value);
  }

  return value?.trim() ? value : "Not set";
}

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFieldAbsenceStatusClass(status: string | null): string {
  switch (status) {
    case "away":
      return "status-reserved";

    case "extended":
      return "status-overdue";

    case "returned":
      return "status-vacant-ready";

    case "cancelled":
      return "status-muted";

    default:
      return "status-muted";
  }
}

function getStayStatusClass(status: string | null): string {
  switch (status) {
    case "checked_in":
    case "occupied":
      return "status-occupied";

    case "reserved":
      return "status-reserved";

    case "completed":
      return "status-vacant-ready";

    case "cancelled":
    case "no_show":
      return "status-muted";

    default:
      return "status-muted";
  }
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

function FieldStatusBadge({
  status,
}: {
  status: string | null;
}): React.JSX.Element {
  const label = isFieldAbsenceStatus(status)
    ? STATUS_LABEL[status]
    : formatLabel(status);

  return (
    <StatusIndicator
      compact
      label={label}
      statusClassName={getFieldAbsenceStatusClass(status)}
    />
  );
}

export default async function FieldAbsenceDetailPage({
  params,
}: FieldAbsenceDetailPageProps): Promise<React.JSX.Element> {
  await requirePermission("field_absences.view");

  const { fieldAbsenceId } = await params;

  async function markReturnedFormAction(formData: FormData): Promise<void> {
    "use server";

    const result = await markFieldAbsenceReturnedAction(
      { ok: false },
      formData,
    );

    if (result.redirectTo) {
      redirect(result.redirectTo);
    }

    redirect(APP_ROUTES.fieldAbsences.detail(fieldAbsenceId));
  }

  async function cancelAbsenceFormAction(formData: FormData): Promise<void> {
    "use server";

    const result = await cancelFieldAbsenceAction({ ok: false }, formData);

    if (result.redirectTo) {
      redirect(result.redirectTo);
    }

    redirect(APP_ROUTES.fieldAbsences.detail(fieldAbsenceId));
  }

  const absence = await getFieldAbsenceById(fieldAbsenceId);

  if (!absence) {
    notFound();
  }

  const isActive = absence.status === "away" || absence.status === "extended";

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Field movement detail</div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Room
                </div>

                <h1 className="mt-1 text-4xl font-semibold leading-none tracking-[-0.065em] text-foreground sm:text-5xl">
                  {absence.room_number ?? "Unknown"}
                </h1>
              </div>

              <div className="min-w-0 pb-1">
                <GuestNameWithPhoto
                  guestId={absence.guest_id ?? ""}
                  name={absence.guest_name ?? "Unknown guest"}
                />

                <p className="mt-1 text-sm leading-6 text-muted">
                  {absence.camp_name ?? "Unknown camp"} ·{" "}
                  {formatValue(absence.destination)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={APP_ROUTES.fieldAbsences.list}
              className="btn-secondary"
            >
              Back to field absences
            </Link>

            <Link href="/room-board" className="btn-secondary">
              Room board
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <main className="min-w-0 space-y-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="metadata-item">
              <div className="metadata-label">Status</div>
              <div className="metadata-value">
                <FieldStatusBadge status={absence.status} />
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Departure</div>
              <div className="metadata-value">
                {formatDateTime(absence.departure_at)}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Expected return</div>
              <div className="metadata-value">
                {formatDateTime(absence.expected_return_at)}
              </div>
            </div>

            <div className="metadata-item">
              <div className="metadata-label">Days away</div>
              <div className="metadata-value">{absence.days_away ?? 0}</div>
            </div>
          </section>

          {absence.is_overdue ? (
            <div className="alert alert-warning">
              <div className="alert-title">Return overdue</div>
              This field absence has passed the expected return time.
            </div>
          ) : null}

          <Card variant="console">
            <CardHeader dense>
              <CardTitle className="text-sm">Field absence record</CardTitle>
              <CardDescription className="text-xs leading-5">
                Movement timing, destination, reason, and active stay context.
              </CardDescription>
            </CardHeader>

            <CardContent dense>
              <dl className="divide-y divide-border">
                <InfoRow
                  label="Guest"
                  value={
                    <GuestNameWithPhoto
                      guestId={absence.guest_id ?? ""}
                      name={absence.guest_name ?? "Unknown guest"}
                    />
                  }
                />

                <InfoRow
                  label="Camp"
                  value={absence.camp_name ?? "Unknown camp"}
                />

                <InfoRow
                  label="Room"
                  value={absence.room_number ?? "Unknown room"}
                />

                <InfoRow
                  label="Stay status"
                  value={
                    <StatusIndicator
                      compact
                      label={formatLabel(absence.stay_status)}
                      statusClassName={getStayStatusClass(absence.stay_status)}
                    />
                  }
                />

                <InfoRow
                  label="Status"
                  value={<FieldStatusBadge status={absence.status} />}
                />

                <InfoRow
                  label="Departure"
                  value={formatDateTime(absence.departure_at)}
                />

                <InfoRow
                  label="Expected return"
                  value={formatDateTime(absence.expected_return_at)}
                />

                <InfoRow
                  label="Actual return"
                  value={formatDateTime(absence.actual_return_at)}
                />

                <InfoRow
                  label="Days away"
                  value={String(absence.days_away ?? 0)}
                />

                <InfoRow
                  label="Days until return"
                  value={String(absence.days_until_return ?? 0)}
                />

                <InfoRow
                  label="Destination"
                  value={formatValue(absence.destination)}
                />

                <InfoRow label="Reason" value={formatValue(absence.reason)} />

                <InfoRow
                  label="Notes"
                  value={
                    <span className="whitespace-pre-wrap text-foreground-soft">
                      {absence.notes?.trim() || "No notes recorded."}
                    </span>
                  }
                />
              </dl>
            </CardContent>
          </Card>

          <Card variant="console">
            <CardHeader dense>
              <CardTitle className="text-sm">Guest and stay details</CardTitle>
              <CardDescription className="text-xs leading-5">
                Contact details and stay timing connected to this field absence.
              </CardDescription>
            </CardHeader>

            <CardContent dense>
              <dl className="divide-y divide-border">
                <InfoRow
                  label="Phone"
                  value={formatValue(absence.guest_phone)}
                />

                <InfoRow
                  label="Email"
                  value={formatValue(absence.guest_email)}
                />

                <InfoRow
                  label="Organization"
                  value={formatValue(absence.guest_organization)}
                />

                <InfoRow
                  label="Department"
                  value={formatValue(absence.guest_department_or_project)}
                />

                <InfoRow
                  label="Stay departure"
                  value={formatDateTime(absence.stay_expected_departure_at)}
                />

                <InfoRow
                  label="Checked in"
                  value={formatDateTime(absence.stay_checked_in_at)}
                />
              </dl>
            </CardContent>
          </Card>

          {absence.status === "returned" ? (
            <Card variant="console">
              <CardHeader dense>
                <CardTitle className="text-sm">Return details</CardTitle>
                <CardDescription className="text-xs leading-5">
                  Return timing and notes recorded when the occupant came back.
                </CardDescription>
              </CardHeader>

              <CardContent dense>
                <dl className="divide-y divide-border">
                  <InfoRow
                    label="Returned at"
                    value={formatDateTime(absence.returned_at)}
                  />

                  <InfoRow
                    label="Actual return"
                    value={formatDateTime(absence.actual_return_at)}
                  />

                  <InfoRow
                    label="Return notes"
                    value={formatValue(absence.return_notes)}
                  />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {absence.status === "cancelled" ? (
            <Card variant="console">
              <CardHeader dense>
                <CardTitle className="text-sm">Cancellation</CardTitle>
                <CardDescription className="text-xs leading-5">
                  Cancellation reason and time.
                </CardDescription>
              </CardHeader>

              <CardContent dense>
                <dl className="divide-y divide-border">
                  <InfoRow
                    label="Cancelled at"
                    value={formatDateTime(absence.cancelled_at)}
                  />

                  <InfoRow
                    label="Reason"
                    value={formatValue(absence.cancellation_reason)}
                  />
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </main>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card variant="inspector">
            <CardHeader dense>
              <CardTitle className="text-sm">Workflow actions</CardTitle>
              <CardDescription className="text-xs leading-5">
                Available actions for this field movement record.
              </CardDescription>
            </CardHeader>

            <CardContent dense className="space-y-4">
              {isActive ? (
                <>
                  <form action={markReturnedFormAction} className="space-y-3">
                    <input
                      type="hidden"
                      name="fieldAbsenceId"
                      value={fieldAbsenceId}
                    />

                    <Input
                      label="Actual return"
                      name="actualReturnAt"
                      type="datetime-local"
                    />

                    <Textarea
                      label="Return notes"
                      name="returnNotes"
                      rows={3}
                      maxLength={500}
                      placeholder="Optional return note..."
                      className="min-h-24 resize-none"
                    />

                    <Button type="submit" variant="success" fullWidth>
                      Mark returned
                    </Button>
                  </form>

                  <div className="border-t border-border" />

                  <form action={cancelAbsenceFormAction} className="space-y-3">
                    <input
                      type="hidden"
                      name="fieldAbsenceId"
                      value={fieldAbsenceId}
                    />

                    <Textarea
                      label="Cancellation reason"
                      name="reason"
                      rows={3}
                      minLength={3}
                      maxLength={500}
                      placeholder="Why is this field absence being cancelled?"
                      className="min-h-24 resize-none"
                    />

                    <Button type="submit" variant="danger" fullWidth>
                      Cancel field absence
                    </Button>
                  </form>
                </>
              ) : (
                <p className="text-sm leading-6 text-muted">
                  No active workflow actions are available for this field
                  absence.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
