import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { getExpectedArrivalById } from "@/lib/queries/expected-arrivals";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import {
  cancelExpectedArrivalAction,
  markExpectedArrivalArrivedAction,
  markExpectedArrivalNoShowAction,
} from "@/lib/actions/expected-arrivals";
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

type ExpectedArrivalDetailPageProps = {
  params: Promise<{
    expectedArrivalId: string;
  }>;
};

type ExpectedArrivalStatus =
  | "expected"
  | "arrived"
  | "allocated"
  | "cancelled"
  | "no_show";

const STATUS_LABEL: Record<ExpectedArrivalStatus, string> = {
  expected: "Expected",
  arrived: "Arrived",
  allocated: "Allocated",
  cancelled: "Cancelled",
  no_show: "No-show",
};

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

function formatValue(value: string | null | undefined): string {
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

function isExpectedArrivalStatus(
  value: string | null | undefined,
): value is ExpectedArrivalStatus {
  return (
    value === "expected" ||
    value === "arrived" ||
    value === "allocated" ||
    value === "cancelled" ||
    value === "no_show"
  );
}

function getExpectedArrivalStatusClass(
  status: string | null | undefined,
): string {
  switch (status) {
    case "expected":
      return "status-reserved";

    case "arrived":
      return "status-occupied";

    case "allocated":
      return "status-vacant-ready";

    case "cancelled":
    case "no_show":
      return "status-muted";

    default:
      return "status-muted";
  }
}

function ExpectedArrivalStatusBadge({
  status,
}: {
  status: string | null | undefined;
}): React.JSX.Element {
  const label = isExpectedArrivalStatus(status)
    ? STATUS_LABEL[status]
    : formatLabel(status);

  return (
    <StatusIndicator
      compact
      label={label}
      statusClassName={getExpectedArrivalStatusClass(status)}
    />
  );
}

function SummaryTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="metadata-item min-h-[4.5rem]">
      <div className="metadata-label">{label}</div>

      <div className="metadata-value mt-2 min-w-0 text-sm leading-5">
        {children}
      </div>
    </div>
  );
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

export default async function ExpectedArrivalDetailPage({
  params,
}: ExpectedArrivalDetailPageProps): Promise<React.JSX.Element> {
  await requirePermission("expected_arrivals.view");

  const { expectedArrivalId } = await params;

  async function markArrivedFormAction(formData: FormData): Promise<void> {
    "use server";

    const result = await markExpectedArrivalArrivedAction(
      { ok: false },
      formData,
    );

    if (result.redirectTo) {
      redirect(result.redirectTo);
    }

    redirect(APP_ROUTES.reception.expectedArrivalDetail(expectedArrivalId));
  }

  async function markNoShowFormAction(formData: FormData): Promise<void> {
    "use server";

    const result = await markExpectedArrivalNoShowAction(
      { ok: false },
      formData,
    );

    if (result.redirectTo) {
      redirect(result.redirectTo);
    }

    redirect(APP_ROUTES.reception.expectedArrivalDetail(expectedArrivalId));
  }

  async function cancelArrivalFormAction(formData: FormData): Promise<void> {
    "use server";

    const result = await cancelExpectedArrivalAction({ ok: false }, formData);

    if (result.redirectTo) {
      redirect(result.redirectTo);
    }

    redirect(APP_ROUTES.reception.expectedArrivalDetail(expectedArrivalId));
  }

  const arrival = await getExpectedArrivalById(expectedArrivalId);

  if (!arrival) {
    notFound();
  }

  const canMutate =
    arrival.status === "expected" || arrival.status === "arrived";

  const canMarkArrived = arrival.status === "expected";
  const canAllocate =
    arrival.status === "expected" || arrival.status === "arrived";

  const hasWorkflowAction = canMutate || canAllocate;

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Guest
                </div>

                <GuestNameWithPhoto
                  guestId={arrival.guest_id ?? ""}
                  name={arrival.guest_name ?? "Expected arrival"}
                  size="lg"
                  className="mt-1 text-3xl sm:text-4xl"
                />
              </div>

              <div className="min-w-0 pb-1">
                <div className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {arrival.camp_name ?? "Unknown camp"}
                </div>

                <p className="mt-1 text-sm leading-6 text-muted">
                  Expected: {formatDateTime(arrival.expected_arrival_at)}
                </p>
              </div>
            </div>
          </div>

          <Link
            href={APP_ROUTES.reception.expectedArrivals}
            className="btn-secondary"
          >
            Back to expected arrivals
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Status">
          <ExpectedArrivalStatusBadge status={arrival.status} />
        </SummaryTile>

        <SummaryTile label="Expected arrival">
          <span className="block break-words">
            {formatDateTime(arrival.expected_arrival_at)}
          </span>
        </SummaryTile>

        <SummaryTile label="Expected departure">
          <span className="block break-words">
            {formatDateTime(arrival.expected_departure_at)}
          </span>
        </SummaryTile>

        <SummaryTile label="Host">
          <span className="block break-words">
            {formatValue(arrival.host_name)}
          </span>
        </SummaryTile>
      </section>

      {arrival.is_overdue ? (
        <div className="alert alert-warning">
          <div className="alert-title">Arrival overdue</div>
          This expected arrival has passed the expected arrival time.
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <main className="min-w-0 space-y-4">
          <Card variant="console">
            <CardHeader dense>
              <CardTitle className="text-sm">Arrival record</CardTitle>
              <CardDescription className="text-xs leading-5">
                Guest, camp, host, timing, purpose, and reception notes.
              </CardDescription>
            </CardHeader>

            <CardContent dense>
              <dl className="divide-y divide-border">
                <InfoRow
                  label="Guest"
                  value={
                    <GuestNameWithPhoto
                      guestId={arrival.guest_id ?? ""}
                      name={arrival.guest_name ?? "Unassigned guest"}
                    />
                  }
                />

                <InfoRow
                  label="Status"
                  value={<ExpectedArrivalStatusBadge status={arrival.status} />}
                />

                <InfoRow
                  label="Camp"
                  value={arrival.camp_name ?? "Unknown camp"}
                />

                <InfoRow
                  label="Expected arrival"
                  value={formatDateTime(arrival.expected_arrival_at)}
                />

                <InfoRow
                  label="Expected departure"
                  value={formatDateTime(arrival.expected_departure_at)}
                />

                <InfoRow
                  label="Phone"
                  value={formatValue(arrival.guest_phone)}
                />

                <InfoRow
                  label="Email"
                  value={formatValue(arrival.guest_email)}
                />

                <InfoRow
                  label="Organization"
                  value={formatValue(arrival.guest_organization)}
                />

                <InfoRow label="Host" value={formatValue(arrival.host_name)} />

                <InfoRow
                  label="Host department"
                  value={formatValue(arrival.host_department)}
                />

                <InfoRow label="Purpose" value={formatValue(arrival.purpose)} />

                <InfoRow
                  label="Notes"
                  value={
                    <span className="whitespace-pre-wrap text-foreground-soft">
                      {arrival.notes?.trim() || "No notes recorded."}
                    </span>
                  }
                />
              </dl>
            </CardContent>
          </Card>

          {arrival.status === "allocated" ? (
            <Card variant="console">
              <CardHeader dense>
                <CardTitle className="text-sm">Allocation details</CardTitle>
                <CardDescription className="text-xs leading-5">
                  Room and stay records created from this expected arrival.
                </CardDescription>
              </CardHeader>

              <CardContent dense>
                <dl className="divide-y divide-border">
                  <InfoRow
                    label="Allocated room"
                    value={formatValue(arrival.allocated_room_number)}
                  />

                  <InfoRow
                    label="Allocated at"
                    value={formatDateTime(arrival.allocated_at)}
                  />

                  <InfoRow
                    label="Stay ID"
                    value={formatValue(arrival.allocated_stay_id)}
                  />

                  <InfoRow
                    label="Allocation ID"
                    value={formatValue(arrival.allocated_allocation_id)}
                  />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {arrival.status === "cancelled" ? (
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
                    value={formatDateTime(arrival.cancelled_at)}
                  />

                  <InfoRow
                    label="Reason"
                    value={formatValue(arrival.cancellation_reason)}
                  />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {arrival.status === "no_show" ? (
            <Card variant="console">
              <CardHeader dense>
                <CardTitle className="text-sm">No-show</CardTitle>
                <CardDescription className="text-xs leading-5">
                  No-show reason and time.
                </CardDescription>
              </CardHeader>

              <CardContent dense>
                <dl className="divide-y divide-border">
                  <InfoRow
                    label="Marked at"
                    value={formatDateTime(arrival.no_show_at)}
                  />

                  <InfoRow
                    label="Reason"
                    value={formatValue(arrival.no_show_reason)}
                  />
                </dl>
              </CardContent>
            </Card>
          ) : null}
        </main>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card variant="inspector">
            <CardHeader dense>
              <CardTitle className="text-sm">Arrival actions</CardTitle>
              <CardDescription className="text-xs leading-5">
                Available reception workflow actions for this expected arrival.
              </CardDescription>
            </CardHeader>

            <CardContent dense className="space-y-4">
              {canAllocate ? (
                <Link
                  href={`${APP_ROUTES.allocations.new}?expectedArrivalId=${encodeURIComponent(
                    expectedArrivalId,
                  )}`}
                  className="btn-primary w-full"
                >
                  Allocate room
                </Link>
              ) : null}

              {canMarkArrived ? (
                <form action={markArrivedFormAction}>
                  <input
                    type="hidden"
                    name="expectedArrivalId"
                    value={expectedArrivalId}
                  />

                  <Button type="submit" variant="secondary" fullWidth>
                    Mark arrived
                  </Button>
                </form>
              ) : null}

              {canMutate ? (
                <>
                  <form action={markNoShowFormAction} className="space-y-3">
                    <input
                      type="hidden"
                      name="expectedArrivalId"
                      value={expectedArrivalId}
                    />

                    <Input
                      name="reason"
                      label="No-show reason"
                      placeholder="Why did the guest not arrive?"
                    />

                    <Button type="submit" variant="warning" fullWidth>
                      Mark no-show
                    </Button>
                  </form>

                  <div className="border-t border-border" />

                  <form action={cancelArrivalFormAction} className="space-y-3">
                    <input
                      type="hidden"
                      name="expectedArrivalId"
                      value={expectedArrivalId}
                    />

                    <Input
                      name="reason"
                      label="Cancellation reason"
                      placeholder="Why is this arrival cancelled?"
                    />

                    <Button type="submit" variant="danger" fullWidth>
                      Cancel arrival
                    </Button>
                  </form>
                </>
              ) : null}

              {!hasWorkflowAction ? (
                <p className="text-sm leading-6 text-muted">
                  No active workflow actions are available for this expected
                  arrival.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
