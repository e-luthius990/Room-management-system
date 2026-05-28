import type { JSX } from "react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

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
import { EmptyState as UiEmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RECEPTION_HANDOFFS_PATH = "/reception/security-handoffs";

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
  reception_received_at: string | null;
  reception_status: string | null;
  related_reservation_id: string | null;
  related_stay_id: string | null;
  note: string | null;
  notes: string | null;
  created_at: string;
};

type HandoffExitRow = {
  guest_id: string;
  camp_id: string;
  exit_at: string;
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

type ReceptionHandoffItem = {
  event: SecurityHandoffEventRow;
  guest: GuestRow | null;
  camp: CampRow | null;
};

type SummaryTone = "neutral" | "success" | "warning" | "danger" | "info";

function handoffDetailPath(securityEventId: string): string {
  return `${RECEPTION_HANDOFFS_PATH}/${securityEventId}`;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
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

function getGuestName(item: ReceptionHandoffItem): string {
  return item.guest?.full_name ?? "Unknown guest";
}

function getGuestContext(item: ReceptionHandoffItem): string {
  const guest = item.guest;

  if (!guest) {
    return "Guest record unavailable";
  }

  const parts = [
    guest.organization,
    guest.department_or_project,
    guest.nationality,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "No organization recorded";
}

function getSecurityNote(event: SecurityHandoffEventRow): string | null {
  return event.notes ?? event.note;
}

function isVipOrDelegate(item: ReceptionHandoffItem): boolean {
  const visitType = item.event.visit_type;
  const category = item.guest?.guest_category;

  return (
    visitType === "vip" ||
    visitType === "delegate" ||
    visitType === "overnight_guest" ||
    category === "vip_guest" ||
    category === "eu_delegate" ||
    category === "american_delegate" ||
    category === "government_official" ||
    Boolean(item.guest?.is_vip)
  );
}

function isHighRisk(item: ReceptionHandoffItem): boolean {
  return (
    item.event.risk_level === "high" || item.event.risk_level === "critical"
  );
}

function isStaleHandoff(item: ReceptionHandoffItem): boolean {
  const minutes = getWaitingMinutes(item.event.sent_to_reception_at);

  return minutes !== null && minutes >= 120;
}

function getPriorityLabel(item: ReceptionHandoffItem): {
  label: string;
  tone: SummaryTone;
} {
  if (isHighRisk(item)) {
    return { label: "High risk", tone: "danger" };
  }

  if (isVipOrDelegate(item)) {
    return { label: "Priority", tone: "warning" };
  }

  if (isStaleHandoff(item)) {
    return { label: "Waiting long", tone: "danger" };
  }

  return { label: "Standard", tone: "neutral" };
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

async function getReceptionSecurityHandoffs(): Promise<ReceptionHandoffItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data: events, error: eventsError } = await supabase
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
        "reception_received_at",
        "reception_status",
        "related_reservation_id",
        "related_stay_id",
        "note",
        "notes",
        "created_at",
      ].join(","),
    )
    .eq("event_type", "sent_to_reception")
    .not("sent_to_reception_at", "is", null)
    .is("reception_received_at", null)
    .or("reception_status.is.null,reception_status.eq.pending")
    .is("related_reservation_id", null)
    .is("related_stay_id", null)
    .order("sent_to_reception_at", { ascending: true })
    .limit(250)
    .returns<SecurityHandoffEventRow[]>();

  if (eventsError) {
    throw new Error(`Failed to load security handoffs: ${eventsError.message}`);
  }

  const eventRows = events ?? [];

  if (eventRows.length === 0) {
    return [];
  }

  const guestIds = uniqueStrings(eventRows.map((event) => event.guest_id));
  const campIds = uniqueStrings(eventRows.map((event) => event.camp_id));

  let guestRows: GuestRow[] = [];
  let campRows: CampRow[] = [];
  let exitRows: HandoffExitRow[] = [];

  if (guestIds.length > 0) {
    const { data, error } = await supabase
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
      .in("id", guestIds)
      .is("archived_at", null)
      .returns<GuestRow[]>();

    if (error) {
      throw new Error(`Failed to load handoff guests: ${error.message}`);
    }

    guestRows = data ?? [];
  }

  if (campIds.length > 0) {
    const { data, error } = await supabase
      .from("camps")
      .select("id,name,code,location")
      .in("id", campIds)
      .is("deleted_at", null)
      .returns<CampRow[]>();

    if (error) {
      throw new Error(`Failed to load handoff camps: ${error.message}`);
    }

    campRows = data ?? [];
  }

  if (guestIds.length > 0) {
    const { data, error } = await supabase
      .from("security_clearance_events")
      .select("guest_id,camp_id,exit_at")
      .in("guest_id", guestIds)
      .not("exit_at", "is", null)
      .returns<HandoffExitRow[]>();

    if (error) {
      throw new Error(`Failed to validate handoff exits: ${error.message}`);
    }

    exitRows = data ?? [];
  }

  const guestsById = new Map<string, GuestRow>();
  const campsById = new Map<string, CampRow>();

  for (const guest of guestRows) {
    guestsById.set(guest.id, guest);
  }

  for (const camp of campRows) {
    campsById.set(camp.id, camp);
  }

  return eventRows
    .filter((event) => !hasExitAfterHandoff(event, exitRows))
    .map((event) => ({
      event,
      guest: guestsById.get(event.guest_id) ?? null,
      camp: campsById.get(event.camp_id) ?? null,
    }));
}

function PriorityBadge({ item }: { item: ReceptionHandoffItem }): JSX.Element {
  const priority = getPriorityLabel(item);

  const className = {
    neutral: "border-border bg-surface-2 text-muted",
    success: "border-success-600/25 bg-success-50 text-success-700",
    warning: "border-warning-700/25 bg-warning-50 text-warning-700",
    danger: "border-danger-600/25 bg-danger-50 text-danger-700",
    info: "border-info-600/25 bg-info-50 text-info-700",
  }[priority.tone];

  return (
    <span
      className={cn(
        "inline-flex border px-2 py-0.5 text-[11px] font-bold",
        className,
      )}
    >
      {priority.label}
    </span>
  );
}

function HandoffActionLinks({
  item,
}: {
  item: ReceptionHandoffItem;
}): JSX.Element {
  const guestId = item.guest?.id ?? item.event.guest_id;

  return (
    <div className="flex flex-wrap items-center justify-start gap-2 xl:min-w-[26rem] xl:justify-end">
      <form action={resolveReceptionSecurityHandoffAction}>
        <input type="hidden" name="securityEventId" value={item.event.id} />
        <input type="hidden" name="receptionStatus" value="received" />

        <button type="submit" className="btn-primary btn-sm">
          Received
        </button>
      </form>

      <form action={resolveReceptionSecurityHandoffAction}>
        <input type="hidden" name="securityEventId" value={item.event.id} />
        <input type="hidden" name="receptionStatus" value="not_received" />

        <button type="submit" className="btn-secondary btn-sm">
          Not received
        </button>
      </form>

      <Link href={handoffDetailPath(item.event.id)} className="inline-action">
        Handoff
      </Link>

      {guestId ? (
        <Link
          href={APP_ROUTES.guests.detail(guestId)}
          className="inline-action"
        >
          Guest
        </Link>
      ) : null}

      <Link
        href={APP_ROUTES.allocations.newFromSecurityHandoff(item.event.id)}
        className="inline-action"
      >
        Allocate
      </Link>

      <Link
        href={APP_ROUTES.stays.checkInFromSecurityHandoff(item.event.id)}
        className="inline-action"
      >
        Check-in
      </Link>
    </div>
  );
}

function HandoffEmptyState(): JSX.Element {
  return (
    <UiEmptyState
      operational
      align="left"
      title="No security handoffs waiting"
      description="Guests sent by security will appear here after gate handoff. Once reception creates a reservation, starts check-in, or links the handoff to a stay, the record leaves this queue."
    />
  );
}

function HandoffQueue({
  handoffs,
}: {
  handoffs: ReceptionHandoffItem[];
}): JSX.Element {
  if (handoffs.length === 0) {
    return (
      <div className="px-3 pb-3 pt-4">
        <HandoffEmptyState />
      </div>
    );
  }

  return (
    <div className="px-3 pb-3 pt-4">
      <div className="divide-y divide-border-subtle overflow-hidden border border-border bg-surface">
        {handoffs.map((item) => {
          const event = item.event;
          const guest = item.guest;
          const securityNote = getSecurityNote(event);
          const priority = getPriorityLabel(item);

          return (
            <article
              key={event.id}
              className="grid gap-3 px-3 py-3 transition hover:bg-surface-2/70 xl:grid-cols-[minmax(0,1fr)_8.5rem_minmax(26rem,auto)] xl:items-center xl:gap-8"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <PriorityBadge item={item} />
                  <VisitTypeBadge visitType={event.visit_type} />
                  <ClearanceStatusBadge status={event.clearance_status} />
                  <RiskLevelBadge riskLevel={event.risk_level} />
                </div>

                <div className="mt-2 flex min-w-0 items-start gap-3">
                  <GuestNameWithPhoto
                    guestId={guest?.id ?? event.guest_id}
                    name={getGuestName(item)}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm text-muted">
                      {getGuestContext(item)}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-muted">
                      <span className="max-w-[14rem] truncate">
                        {item.camp
                          ? `${item.camp.name} (${item.camp.code})`
                          : "Unknown camp"}
                      </span>

                      <span className="max-w-[11rem] truncate">
                        Sent {formatDateTime(event.sent_to_reception_at)}
                      </span>

                      <span className="max-w-[10rem] truncate">
                        Host {event.host_name ?? "not recorded"}
                      </span>

                      <span className="max-w-[12rem] truncate">
                        Contact {guest?.phone ?? guest?.email ?? "not recorded"}
                      </span>
                    </div>

                    {event.purpose ? (
                      <p className="mt-1 line-clamp-1 text-xs text-foreground-soft">
                        Purpose: {event.purpose}
                      </p>
                    ) : null}

                    {securityNote ? (
                      <p className="mt-1 line-clamp-1 text-xs font-medium text-warning-700">
                        Security note: {securityNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 xl:block xl:justify-self-end xl:text-right">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    Waiting
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 whitespace-nowrap text-sm font-semibold",
                      priority.tone === "danger"
                        ? "text-danger-700"
                        : "text-foreground",
                    )}
                  >
                    {formatWaitingTime(event.sent_to_reception_at)}
                  </p>
                </div>
              </div>

              <div className="xl:justify-self-end">
                <HandoffActionLinks item={item} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default async function ReceptionSecurityHandoffsPage(): Promise<JSX.Element> {
  noStore();

  await requirePermission("reception.handle_security_handoffs");
  await requirePermission("guests.view");

  const handoffs = await getReceptionSecurityHandoffs();
  const staleCount = handoffs.filter(isStaleHandoff).length;

  return (
    <div className="space-y-3">
      {staleCount > 0 ? (
        <div className="alert alert-danger">
          {staleCount} handoff{staleCount === 1 ? "" : "s"}{" "}
          {staleCount === 1 ? "has" : "have"} been waiting for more than two
          hours.
        </div>
      ) : null}

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border bg-surface px-3 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Security handoffs
              </p>
              <p className="text-sm font-semibold text-foreground">
                {handoffs.length} {handoffs.length === 1 ? "guest" : "guests"}{" "}
                awaiting reception
              </p>
            </div>

            <p className="text-xs text-muted">
              Cleared gate records ready for reception.
            </p>
          </div>
        </div>

        <HandoffQueue handoffs={handoffs} />
      </section>
    </div>
  );
}
