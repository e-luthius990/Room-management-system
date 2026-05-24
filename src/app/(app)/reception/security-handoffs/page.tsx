import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
import { EmptyState as UiEmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RECEPTION_HANDOFFS_PATH = "/reception/security-handoffs";

type PageSearchParams = {
  q?: string | string[];
  visitType?: string | string[];
  risk?: string | string[];
};

type ReceptionSecurityHandoffsPageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
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

const visitTypeOptions = [
  { value: "all", label: "All visits" },
  { value: "day_visitor", label: "Day visitors" },
  { value: "overnight_guest", label: "Overnight guests" },
  { value: "contractor", label: "Contractors" },
  { value: "delegate", label: "Delegates" },
  { value: "vip", label: "VIPs" },
  { value: "delivery", label: "Deliveries" },
  { value: "staff_visit", label: "Staff visits" },
] as const;

const riskOptions = [
  { value: "all", label: "All risk levels" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "elevated", label: "Elevated" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

function handoffDetailPath(securityEventId: string): string {
  return `${RECEPTION_HANDOFFS_PATH}/${securityEventId}`;
}

function getFirstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeFilterValue(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizeSearchText(value: string | null | undefined): string {
  return value?.toLowerCase().trim() ?? "";
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

function matchesSearch(item: ReceptionHandoffItem, query: string): boolean {
  if (!query) {
    return true;
  }

  const guest = item.guest;
  const event = item.event;
  const camp = item.camp;

  const haystack = [
    guest?.full_name,
    guest?.organization,
    guest?.department_or_project,
    guest?.nationality,
    guest?.phone,
    guest?.email,
    guest?.id_or_passport_number,
    guest?.guest_category,
    camp?.name,
    camp?.code,
    event.host_name,
    event.host_department,
    event.purpose,
    event.visit_type,
    event.risk_level,
    event.clearance_status,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return haystack.includes(query.toLowerCase().trim());
}

function applyFilters({
  handoffs,
  q,
  visitType,
  risk,
}: {
  handoffs: ReceptionHandoffItem[];
  q: string;
  visitType: string;
  risk: string;
}): ReceptionHandoffItem[] {
  return handoffs.filter((item) => {
    if (!matchesSearch(item, q)) {
      return false;
    }

    if (
      visitType &&
      visitType !== "all" &&
      item.event.visit_type !== visitType
    ) {
      return false;
    }

    if (risk && risk !== "all" && item.event.risk_level !== risk) {
      return false;
    }

    return true;
  });
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

function PressureCell({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "warning" | "danger" | "info";
}): React.JSX.Element {
  const toneClass = {
    default: "bg-surface",
    warning: "bg-warning-50/70",
    danger: "bg-danger-50/60",
    info: "bg-info-50/60",
  }[tone];

  return (
    <article className={cn("px-4 py-3", toneClass)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>

        <p className="text-xl font-semibold tracking-[-0.04em] text-foreground">
          {value}
        </p>
      </div>

      <p className="mt-1 truncate text-xs text-muted">{hint}</p>
    </article>
  );
}

function PriorityBadge({
  item,
}: {
  item: ReceptionHandoffItem;
}): React.JSX.Element {
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

function FilterPanel({
  q,
  visitType,
  risk,
}: {
  q: string;
  visitType: string;
  risk: string;
}): React.JSX.Element {
  return (
    <Card variant="console" className="min-w-0">
      <CardContent className="p-3">
        <form
          action={APP_ROUTES.reception.securityHandoffs}
          method="get"
          className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto_auto] lg:items-end"
        >
          <Input
            label="Search"
            id="handoff-search"
            name="q"
            defaultValue={q}
            placeholder="Guest, organization, host, camp, ID, phone..."
          />

          <Select
            label="Visit type"
            id="visitType"
            name="visitType"
            defaultValue={visitType || "all"}
            options={visitTypeOptions}
          />

          <Select
            label="Risk"
            id="risk"
            name="risk"
            defaultValue={risk || "all"}
            options={riskOptions}
          />

          <button type="submit" className="btn-primary">
            Apply
          </button>

          <Link
            href={APP_ROUTES.reception.securityHandoffs}
            className="btn-secondary"
          >
            Reset
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}

function HandoffActionLinks({
  item,
}: {
  item: ReceptionHandoffItem;
}): React.JSX.Element {
  const guestId = item.guest?.id ?? item.event.guest_id;

  return (
    <div className="grid gap-2">
      <Link
        href={handoffDetailPath(item.event.id)}
        className="btn-primary btn-sm"
      >
        View handoff
      </Link>

      {guestId ? (
        <Link
          href={APP_ROUTES.guests.detail(guestId)}
          className="btn-secondary btn-sm"
        >
          Open guest
        </Link>
      ) : null}

      <Link
        href={APP_ROUTES.reservations.newFromSecurityHandoff(item.event.id)}
        className="btn-secondary btn-sm"
      >
        Create reservation
      </Link>

      <Link
        href={APP_ROUTES.allocations.newFromSecurityHandoff(item.event.id)}
        className="btn-secondary btn-sm"
      >
        Allocate room
      </Link>

      <Link
        href={APP_ROUTES.stays.checkInFromSecurityHandoff(item.event.id)}
        className="btn-secondary btn-sm"
      >
        Start check-in
      </Link>
    </div>
  );
}

function HandoffEmptyState(): React.JSX.Element {
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
}): React.JSX.Element {
  if (handoffs.length === 0) {
    return (
      <div className="p-4">
        <HandoffEmptyState />
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-3">
      {handoffs.map((item) => {
        const event = item.event;
        const guest = item.guest;
        const securityNote = getSecurityNote(event);

        return (
          <Card key={event.id} variant="console" className="min-w-0">
            <CardContent className="p-0">
              <div className="grid xl:grid-cols-[minmax(0,1fr)_13rem]">
                <div className="min-w-0 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge item={item} />
                    <VisitTypeBadge visitType={event.visit_type} />
                    <ClearanceStatusBadge status={event.clearance_status} />
                    <RiskLevelBadge riskLevel={event.risk_level} />
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold tracking-[-0.025em] text-foreground">
                        {getGuestName(item)}
                      </h2>

                      <p className="mt-1 line-clamp-1 text-sm text-muted">
                        {getGuestContext(item)}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Waiting
                      </div>

                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {formatWaitingTime(event.sent_to_reception_at)}
                      </div>
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-border pt-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Camp
                      </dt>
                      <dd className="mt-1 truncate text-foreground">
                        {item.camp
                          ? `${item.camp.name} (${item.camp.code})`
                          : "Unknown camp"}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Sent
                      </dt>
                      <dd className="mt-1 text-foreground">
                        {formatDateTime(event.sent_to_reception_at)}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Host
                      </dt>
                      <dd className="mt-1 truncate text-foreground">
                        {event.host_name ?? "Not recorded"}
                      </dd>
                    </div>

                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Contact
                      </dt>
                      <dd className="mt-1 truncate text-foreground">
                        {guest?.phone ?? guest?.email ?? "Not recorded"}
                      </dd>
                    </div>
                  </dl>

                  {event.purpose ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Purpose
                      </div>

                      <div className="mt-1 line-clamp-2 text-sm leading-6 text-foreground">
                        {event.purpose}
                      </div>
                    </div>
                  ) : null}

                  {securityNote ? (
                    <div className="mt-3 border-t border-warning-700/25 pt-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-warning-700">
                        Security note
                      </div>

                      <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-warning-700">
                        {securityNote}
                      </div>
                    </div>
                  ) : null}
                </div>

                <aside className="border-t border-border bg-surface-2/45 p-3 xl:border-l xl:border-t-0">
                  <HandoffActionLinks item={item} />
                </aside>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default async function ReceptionSecurityHandoffsPage({
  searchParams,
}: ReceptionSecurityHandoffsPageProps): Promise<React.JSX.Element> {
  noStore();

  await requirePermission("reception.handle_security_handoffs");
  await requirePermission("guests.view");

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const q = normalizeFilterValue(getFirstParam(resolvedSearchParams.q));
  const visitType =
    normalizeFilterValue(getFirstParam(resolvedSearchParams.visitType)) ||
    "all";
  const risk =
    normalizeFilterValue(getFirstParam(resolvedSearchParams.risk)) || "all";

  const handoffs = await getReceptionSecurityHandoffs();
  const filteredHandoffs = applyFilters({ handoffs, q, visitType, risk });

  const highRiskCount = handoffs.filter(isHighRisk).length;
  const priorityCount = handoffs.filter(isVipOrDelegate).length;
  const staleCount = handoffs.filter(isStaleHandoff).length;

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-border px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            Reception handoff control
          </p>

          <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
            Security handoffs
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Guests cleared and sent forward by security, waiting for reception
            handling.
          </p>
        </div>

        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <PressureCell
            label="Waiting"
            value={handoffs.length}
            hint="Unlinked handoffs"
          />

          <PressureCell
            label="Filtered"
            value={filteredHandoffs.length}
            hint="Current view"
            tone="info"
          />

          <PressureCell
            label="Priority"
            value={priorityCount}
            hint="VIP / delegates"
            tone={priorityCount > 0 ? "warning" : "default"}
          />

          <PressureCell
            label="High risk"
            value={highRiskCount}
            hint="Needs care"
            tone={highRiskCount > 0 ? "danger" : "default"}
          />
        </div>
      </section>

      {staleCount > 0 ? (
        <div className="alert alert-danger">
          {staleCount} handoff{staleCount === 1 ? "" : "s"} have been waiting
          for more than two hours.
        </div>
      ) : null}

      <FilterPanel q={q} visitType={visitType} risk={risk} />

      <Card variant="console" className="min-w-0">
        <CardHeader className="border-b border-border px-4 py-3">
          <CardTitle className="text-sm">Reception handling queue</CardTitle>

          <CardDescription className="mt-1 text-xs leading-5">
            Start the correct receptionist workflow from each security handoff.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <HandoffQueue handoffs={filteredHandoffs} />
        </CardContent>
      </Card>
    </div>
  );
}
