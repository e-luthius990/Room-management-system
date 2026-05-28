import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveFieldAbsenceByStayId } from "@/lib/queries/field-absences";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldAbsenceForm } from "@/components/field-absence/field-absence-form";
import { StatusIndicator } from "@/components/ui/StatusIndicator";

type NewFieldAbsencePageProps = {
  params: Promise<{
    stayId: string;
  }>;
};

type StayForFieldAbsence = {
  stay_id: string;
  camp_id: string;
  camp_name: string | null;
  room_id: string;
  room_number: string | null;
  guest_id: string;
  guest_name: string | null;
  guest_category: string | null;
  organization: string | null;
  expected_departure_at: string | null;
  checked_in_at: string | null;
  status: string | null;
};

async function getStayForFieldAbsence(
  stayId: string,
): Promise<StayForFieldAbsence | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("safe_current_stays_view")
    .select(
      [
        "stay_id",
        "camp_id",
        "camp_name",
        "room_id",
        "room_number",
        "guest_id",
        "guest_name",
        "guest_category",
        "organization",
        "expected_departure_at",
        "checked_in_at",
        "status",
      ].join(","),
    )
    .eq("stay_id", stayId)
    .returns<StayForFieldAbsence[]>()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
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

function isActiveStay(status: string | null): boolean {
  return status === "checked_in" || status === "occupied";
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-border py-2.5 last:border-b-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm font-semibold leading-5 text-foreground">
        {value}
      </dd>
    </div>
  );
}

export default async function NewFieldAbsencePage({
  params,
}: NewFieldAbsencePageProps): Promise<React.JSX.Element> {
  await requirePermission("field_absences.create");

  const { stayId } = await params;

  const [stay, activeAbsence] = await Promise.all([
    getStayForFieldAbsence(stayId),
    getActiveFieldAbsenceByStayId(stayId),
  ]);

  if (!stay) {
    notFound();
  }

  const activeStay = isActiveStay(stay.status);
  const hasActiveAbsence = Boolean(activeAbsence?.field_absence_id);
  const canCreateFieldAbsence = activeStay && !hasActiveAbsence;

  return (
    <div className="page-stack">
      <section className="hidden">
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Field movement record</div>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Room
                </div>

                <h1 className="mt-1 text-4xl font-semibold leading-none tracking-[-0.065em] text-foreground sm:text-5xl">
                  {stay.room_number ?? "Unknown"}
                </h1>
              </div>

              <div className="min-w-0 pb-1">
                <GuestNameWithPhoto
                  guestId={stay.guest_id}
                  name={stay.guest_name ?? "Unknown guest"}
                  size="md"
                />

                <p className="mt-1 text-sm leading-6 text-muted">
                  {stay.camp_name ?? "Unknown camp"} · Field absence setup
                </p>
              </div>
            </div>
          </div>

          <Link
            href={APP_ROUTES.stays.detail(stayId)}
            className="btn-secondary"
          >
            Back to stay
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-20 xl:self-start">
          <Card variant="inspector">
            <CardHeader dense>
              <CardTitle className="text-sm">Current stay</CardTitle>
              <CardDescription className="text-xs leading-5">
                Stay context before recording field movement.
              </CardDescription>
            </CardHeader>

            <CardContent dense>
              <dl className="divide-y divide-border">
                <DetailRow
                  label="Guest"
                  value={
                    <GuestNameWithPhoto
                      guestId={stay.guest_id}
                      name={stay.guest_name ?? "Unknown"}
                    />
                  }
                />

                <DetailRow
                  label="Category"
                  value={formatLabel(stay.guest_category)}
                />

                <DetailRow
                  label="Organization"
                  value={stay.organization ?? "Not set"}
                />

                <DetailRow label="Room" value={stay.room_number ?? "Unknown"} />

                <DetailRow label="Camp" value={stay.camp_name ?? "Unknown"} />

                <DetailRow
                  label="Status"
                  value={
                    <StatusIndicator
                      compact
                      label={formatLabel(stay.status)}
                      statusClassName={getStayStatusClass(stay.status)}
                    />
                  }
                />

                <DetailRow
                  label="Checked in"
                  value={formatDateTime(stay.checked_in_at)}
                />

                <DetailRow
                  label="Departure"
                  value={formatDateTime(stay.expected_departure_at)}
                />
              </dl>
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0">
          <Card variant="console">
            <CardContent dense>
              {!activeStay ? (
                <EmptyState
                  operational
                  align="left"
                  size="sm"
                  tone="warning"
                  title="This stay is not active"
                  description="Only checked-in or occupied stays can be marked as field absence."
                />
              ) : hasActiveAbsence && activeAbsence?.field_absence_id ? (
                <div className="space-y-4">
                  <EmptyState
                    operational
                    align="left"
                    size="sm"
                    tone="warning"
                    title="Active field absence already exists"
                    description="This stay already has an active field absence. Return or cancel the existing record before creating another."
                  />

                  <Link
                    href={APP_ROUTES.fieldAbsences.detail(
                      activeAbsence.field_absence_id,
                    )}
                    className="btn-primary"
                  >
                    Open active field absence
                  </Link>
                </div>
              ) : canCreateFieldAbsence ? (
                <FieldAbsenceForm stayId={stayId} />
              ) : null}
            </CardContent>
          </Card>
        </main>
      </section>
    </div>
  );
}
