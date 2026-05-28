import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusIndicator } from "@/components/ui/StatusIndicator";

type CheckInPageProps = {
  searchParams?: Promise<{
    securityEventId?: string | string[];
  }>;
};

type SecurityHandoffRow = {
  id: string;
  guest_id: string;
  camp_id: string;
  clearance_status: string | null;
  visit_type: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  sent_to_reception_at: string | null;
  reception_status: string | null;
  related_reservation_id: string | null;
  related_stay_id: string | null;
};

type GuestRow = {
  id: string;
  full_name: string | null;
  guest_category: string | null;
  organization: string | null;
  profile_photo_path: string | null;
  profile_photo_updated_at: string | null;
};

type CampRow = {
  id: string;
  name: string | null;
  code: string | null;
};

type HandoffCheckInContext = {
  event: SecurityHandoffRow;
  guest: GuestRow | null;
  camp: CampRow | null;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatLabel(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function getHandoffContext(
  securityEventId: string,
): Promise<HandoffCheckInContext | null> {
  const supabase = await createServerSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("security_clearance_events")
    .select(
      [
        "id",
        "guest_id",
        "camp_id",
        "clearance_status",
        "visit_type",
        "purpose",
        "host_name",
        "host_department",
        "sent_to_reception_at",
        "reception_status",
        "related_reservation_id",
        "related_stay_id",
      ].join(","),
    )
    .eq("id", securityEventId)
    .returns<SecurityHandoffRow[]>()
    .maybeSingle();

  if (eventError) {
    throw new Error(`Failed to load security handoff: ${eventError.message}`);
  }

  if (!event) {
    return null;
  }

  const [{ data: guest, error: guestError }, { data: camp, error: campError }] =
    await Promise.all([
      supabase
        .from("guests")
        .select(
          [
            "id",
            "full_name",
            "guest_category",
            "organization",
            "profile_photo_path",
            "profile_photo_updated_at",
          ].join(","),
        )
        .eq("id", event.guest_id)
        .returns<GuestRow[]>()
        .maybeSingle(),

      supabase
        .from("camps")
        .select("id,name,code")
        .eq("id", event.camp_id)
        .returns<CampRow[]>()
        .maybeSingle(),
    ]);

  if (guestError) {
    throw new Error(`Failed to load handoff guest: ${guestError.message}`);
  }

  if (campError) {
    throw new Error(`Failed to load handoff camp: ${campError.message}`);
  }

  return {
    event,
    guest: guest ?? null,
    camp: camp ?? null,
  };
}

export default async function CheckInPage({
  searchParams,
}: CheckInPageProps): Promise<React.JSX.Element> {
  noStore();

  await requirePermission("stays.check_in");

  const params = searchParams ? await searchParams : undefined;
  const securityEventId = firstParam(params?.securityEventId);

  if (!securityEventId) {
    redirect(`${APP_ROUTES.stays.list}?view=reserved`);
  }

  const context = await getHandoffContext(securityEventId);

  if (!context) {
    notFound();
  }

  const { event, guest, camp } = context;

  if (event.related_stay_id) {
    redirect(APP_ROUTES.stays.detail(event.related_stay_id));
  }

  if (event.related_reservation_id) {
    redirect(APP_ROUTES.reservations.detail(event.related_reservation_id));
  }

  const guestName = guest?.full_name ?? "Unknown guest";

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Reception check-in</div>

            <div className="mt-2">
              <GuestNameWithPhoto
                guestId={event.guest_id}
                name={guestName}
                photoPath={guest?.profile_photo_path}
                photoUpdatedAt={guest?.profile_photo_updated_at}
                size="lg"
                className="text-2xl sm:text-3xl"
              />
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              This handoff has not been linked to a reservation or reserved stay
              yet. Create a reservation or allocate a room before confirming
              check-in.
            </p>
          </div>

          <Link
            href={APP_ROUTES.reception.securityHandoffDetail(event.id)}
            className="btn-secondary"
          >
            Back to handoff
          </Link>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card variant="console">
          <CardHeader dense>
            <CardTitle className="text-sm">Handoff status</CardTitle>
          </CardHeader>

          <CardContent dense>
            <dl className="divide-y divide-border">
              <InfoRow label="Camp" value={camp?.name ?? "Unknown camp"} />
              <InfoRow label="Camp code" value={camp?.code ?? "Not set"} />
              <InfoRow
                label="Sent to reception"
                value={formatDateTime(event.sent_to_reception_at)}
              />
              <InfoRow
                label="Reception status"
                value={formatLabel(event.reception_status ?? "pending")}
              />
              <InfoRow
                label="Visit type"
                value={formatLabel(event.visit_type)}
              />
              <InfoRow label="Purpose" value={event.purpose ?? "Not set"} />
              <InfoRow
                label="Host"
                value={
                  [event.host_name, event.host_department]
                    .filter(Boolean)
                    .join(" / ") || "Not set"
                }
              />
            </dl>
          </CardContent>
        </Card>

        <aside className="space-y-3">
          <StatusIndicator
            compact
            label={formatLabel(event.clearance_status)}
            statusClassName="status-vacant-ready"
          />

          <Link
            href={APP_ROUTES.reservations.newFromSecurityHandoff(event.id)}
            className="btn-secondary w-full"
          >
            Create reservation
          </Link>

          <Link
            href={APP_ROUTES.allocations.newFromSecurityHandoff(event.id)}
            className="btn-primary w-full"
          >
            Allocate room
          </Link>

          <Link
            href={`${APP_ROUTES.stays.list}?view=reserved`}
            className="btn-secondary w-full"
          >
            Open check-in queue
          </Link>
        </aside>
      </section>

      <EmptyState
        operational
        align="left"
        size="sm"
        title="No reserved stay is linked yet"
        description="Check-in is completed from the reservation or reserved stay detail after the guest has a room assignment."
      />
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
    <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm font-semibold leading-6 text-foreground">
        {value}
      </dd>
    </div>
  );
}
