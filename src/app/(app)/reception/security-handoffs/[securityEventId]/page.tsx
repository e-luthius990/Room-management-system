import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { resolveReceptionSecurityHandoffAction } from "@/lib/actions/security/create-clearance-event";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import {
  ClearanceStatusBadge,
  RiskLevelBadge,
  VisitTypeBadge,
} from "@/components/security/security-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    securityEventId: string;
  }>;
};

type SecurityHandoffEventRow = {
  id: string;
  guest_id: string;
  camp_id: string;
  clearance_status: string;
  previous_status: string | null;
  new_status: string | null;
  risk_level: string | null;
  event_type: string | null;
  visit_type: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  entry_at: string | null;
  exit_at: string | null;
  sent_to_reception_at: string | null;
  sent_to_reception_by: string | null;
  reception_received_at: string | null;
  reception_status: string | null;
  related_reservation_id: string | null;
  related_stay_id: string | null;
  note: string | null;
  notes: string | null;
  created_at: string;
};

type GuestRow = {
  id: string;
  full_name: string;
  guest_category: string;
  organization: string | null;
  department_or_project: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  id_or_passport_number: string | null;
  is_vip: boolean;
  security_clearance_status: string | null;
};

type CampRow = {
  id: string;
  name: string;
  code: string;
  location: string | null;
};

type HandoffExitRow = {
  guest_id: string;
  camp_id: string;
  exit_at: string;
};

type HandoffDetail = {
  event: SecurityHandoffEventRow;
  guest: GuestRow | null;
  camp: CampRow | null;
};

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

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Kampala",
  }).format(date);
}

function textValue(value: string | null | undefined, fallback = "—"): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

function getWaitingMinutes(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
}

function formatWaitingTime(value: string | null | undefined): string {
  const minutes = getWaitingMinutes(value);

  if (minutes === null) {
    return "—";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes === 0
    ? `${hours} hr`
    : `${hours} hr ${remainingMinutes} min`;
}

function getSecurityNote(event: SecurityHandoffEventRow): string {
  return textValue(event.notes ?? event.note, "No security notes recorded.");
}

function hasExitAfterHandoff(
  event: SecurityHandoffEventRow,
  exits: HandoffExitRow[],
): boolean {
  if (!event.sent_to_reception_at) {
    return false;
  }

  const handoffTime = new Date(event.sent_to_reception_at).getTime();

  if (!Number.isFinite(handoffTime)) {
    return false;
  }

  return exits.some((exit) => {
    if (exit.guest_id !== event.guest_id || exit.camp_id !== event.camp_id) {
      return false;
    }

    const exitTime = new Date(exit.exit_at).getTime();

    return Number.isFinite(exitTime) && exitTime >= handoffTime;
  });
}

function LabelValueRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid gap-2 border-b border-border/80 py-2.5 last:border-b-0 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm leading-5 text-foreground">{value}</dd>
    </div>
  );
}

function DetailSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section className="border-b border-border last:border-b-0">
      <div className="grid gap-4 px-4 py-4 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-[-0.015em] text-foreground">
            {title}
          </h2>

          {description ? (
            <p className="mt-1 max-w-[16rem] text-xs leading-5 text-muted">
              {description}
            </p>
          ) : null}
        </div>

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

function HandoffActionLinks({
  event,
  guestId,
}: {
  event: SecurityHandoffEventRow;
  guestId: string;
}): React.JSX.Element {
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 border-b border-border pb-3">
        <form action={resolveReceptionSecurityHandoffAction}>
          <input type="hidden" name="securityEventId" value={event.id} />
          <input type="hidden" name="receptionStatus" value="received" />

          <button type="submit" className="btn-primary btn-sm w-full">
            Received guest
          </button>
        </form>

        <form action={resolveReceptionSecurityHandoffAction}>
          <input type="hidden" name="securityEventId" value={event.id} />
          <input type="hidden" name="receptionStatus" value="not_received" />

          <button type="submit" className="btn-secondary btn-sm w-full">
            Not received
          </button>
        </form>
      </div>

      <div className="grid gap-2">
        <Link
          href={APP_ROUTES.guests.detail(guestId)}
          className="btn-secondary btn-sm"
        >
          Open guest
        </Link>

        <Link
          href={APP_ROUTES.reservations.newFromSecurityHandoff(event.id)}
          className="btn-secondary btn-sm"
        >
          Create reservation
        </Link>

        <Link
          href={APP_ROUTES.allocations.newFromSecurityHandoff(event.id)}
          className="btn-secondary btn-sm"
        >
          Allocate room
        </Link>

        <Link
          href={APP_ROUTES.stays.checkInFromSecurityHandoff(event.id)}
          className="btn-primary btn-sm"
        >
          Start check-in
        </Link>

        <Link
          href={APP_ROUTES.reception.securityHandoffs}
          className="btn-secondary btn-sm"
        >
          Back to queue
        </Link>
      </div>
    </div>
  );
}

async function getHandoffDetail(
  securityEventId: string,
): Promise<HandoffDetail | null> {
  const supabase = await createServerSupabaseClient();

  const { data: event, error: eventError } = await supabase
    .from("security_clearance_events")
    .select(
      [
        "id",
        "guest_id",
        "camp_id",
        "clearance_status",
        "previous_status",
        "new_status",
        "risk_level",
        "event_type",
        "visit_type",
        "purpose",
        "host_name",
        "host_department",
        "entry_at",
        "exit_at",
        "sent_to_reception_at",
        "sent_to_reception_by",
        "reception_received_at",
        "reception_status",
        "related_reservation_id",
        "related_stay_id",
        "note",
        "notes",
        "created_at",
      ].join(","),
    )
    .eq("id", securityEventId)
    .eq("event_type", "sent_to_reception")
    .not("sent_to_reception_at", "is", null)
    .is("reception_received_at", null)
    .or("reception_status.is.null,reception_status.eq.pending")
    .is("related_reservation_id", null)
    .is("related_stay_id", null)
    .maybeSingle()
    .returns<SecurityHandoffEventRow | null>();

  if (eventError) {
    throw new Error(`Failed to load handoff: ${eventError.message}`);
  }

  if (!event) {
    return null;
  }

  const [guestResult, campResult, exitsResult] = await Promise.all([
    supabase
      .from("guests")
      .select(
        [
          "id",
          "full_name",
          "guest_category",
          "organization",
          "department_or_project",
          "nationality",
          "phone",
          "email",
          "id_or_passport_number",
          "is_vip",
          "security_clearance_status",
        ].join(","),
      )
      .eq("id", event.guest_id)
      .is("archived_at", null)
      .maybeSingle()
      .returns<GuestRow | null>(),

    supabase
      .from("camps")
      .select("id,name,code,location")
      .eq("id", event.camp_id)
      .is("deleted_at", null)
      .maybeSingle()
      .returns<CampRow | null>(),

    supabase
      .from("security_clearance_events")
      .select("guest_id,camp_id,exit_at")
      .eq("guest_id", event.guest_id)
      .eq("camp_id", event.camp_id)
      .not("exit_at", "is", null)
      .returns<HandoffExitRow[]>(),
  ]);

  if (guestResult.error) {
    throw new Error(`Failed to load guest: ${guestResult.error.message}`);
  }

  if (campResult.error) {
    throw new Error(`Failed to load camp: ${campResult.error.message}`);
  }

  if (exitsResult.error) {
    throw new Error(
      `Failed to validate guest exit: ${exitsResult.error.message}`,
    );
  }

  if (hasExitAfterHandoff(event, exitsResult.data ?? [])) {
    return null;
  }

  return {
    event,
    guest: guestResult.data ?? null,
    camp: campResult.data ?? null,
  };
}

export default async function ReceptionSecurityHandoffDetailPage({
  params,
}: PageProps): Promise<React.JSX.Element> {
  noStore();

  await requirePermission("reception.handle_security_handoffs");
  await requirePermission("guests.view");

  const { securityEventId } = await params;
  const detail = await getHandoffDetail(securityEventId);

  if (!detail) {
    notFound();
  }

  const { event, guest, camp } = detail;

  const guestName = textValue(guest?.full_name, "Unknown guest");
  const guestId = guest?.id ?? event.guest_id;

  const hostParts = [event.host_name, event.host_department]
    .map((value) => textValue(value, ""))
    .filter((value) => value.length > 0);

  const host = hostParts.length > 0 ? hostParts.join(" · ") : "—";

  return (
    <div className="page-stack">
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18.5rem] xl:items-start">
        <Card variant="console" className="min-w-0 overflow-hidden">
          <div className="border-b border-border px-4 py-4">
            <GuestNameWithPhoto
              guestId={guestId}
              name={guestName}
              size="lg"
              className="text-2xl sm:text-3xl"
            />
          </div>

          <DetailSection
            title="Security status"
            description="Current handoff state and clearance posture."
          >
            <div className="mb-2 flex flex-wrap gap-2">
              <VisitTypeBadge visitType={event.visit_type} />
              <ClearanceStatusBadge status={event.clearance_status} />
              <RiskLevelBadge riskLevel={event.risk_level} />
            </div>

            <dl>
              <LabelValueRow
                label="Sent"
                value={formatDateTime(event.sent_to_reception_at)}
              />

              <LabelValueRow
                label="Waiting"
                value={formatWaitingTime(event.sent_to_reception_at)}
              />

              <LabelValueRow
                label="Status"
                value={formatLabel(event.reception_status ?? "pending")}
              />

              <LabelValueRow
                label="Camp"
                value={camp ? `${camp.name} (${camp.code})` : "Unknown camp"}
              />
            </dl>
          </DetailSection>

          <DetailSection
            title="Guest details"
            description="Identity and contact information available to reception."
          >
            <dl>
              <LabelValueRow
                label="Full name"
                value={<GuestNameWithPhoto guestId={guestId} name={guestName} />}
              />

              <LabelValueRow
                label="Category"
                value={formatLabel(guest?.guest_category)}
              />

              <LabelValueRow
                label="Organization"
                value={textValue(guest?.organization)}
              />

              <LabelValueRow
                label="Department"
                value={textValue(guest?.department_or_project)}
              />

              <LabelValueRow label="Phone" value={textValue(guest?.phone)} />

              <LabelValueRow label="Email" value={textValue(guest?.email)} />

              <LabelValueRow
                label="ID / Passport"
                value={textValue(guest?.id_or_passport_number)}
              />

              <LabelValueRow
                label="Nationality"
                value={textValue(guest?.nationality)}
              />
            </dl>
          </DetailSection>

          <DetailSection
            title="Visit details"
            description="Purpose, host, and security notes submitted during handoff."
          >
            <dl>
              <LabelValueRow label="Purpose" value={textValue(event.purpose)} />

              <LabelValueRow label="Host" value={host} />

              <LabelValueRow
                label="Security note"
                value={
                  <span className="whitespace-pre-wrap">
                    {getSecurityNote(event)}
                  </span>
                }
              />
            </dl>
          </DetailSection>
        </Card>

        <aside className="grid min-w-0 gap-4 xl:sticky xl:top-4">
          <Card variant="console" className="min-w-0">
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm">Reception actions</CardTitle>

              <CardDescription className="mt-1 text-xs leading-5">
                Continue the correct workflow from this security handoff.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3">
              <HandoffActionLinks event={event} guestId={guestId} />
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
