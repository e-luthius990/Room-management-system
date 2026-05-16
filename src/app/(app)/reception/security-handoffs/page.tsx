import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
import {
  ClearanceStatusBadge,
  RiskLevelBadge,
  VisitTypeBadge,
} from "@/components/security/security-status-badge";
import { cn } from "@/lib/utils/cn";

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
  { value: "other", label: "Other" },
] as const;

const riskOptions = [
  { value: "all", label: "All risk levels" },
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "elevated", label: "Elevated" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
] as const;

function getFirstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
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

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
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
    dateStyle: "medium",
    timeStyle: "short",
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

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
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
    return { label: "Priority guest", tone: "warning" };
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
        "related_reservation_id",
        "related_stay_id",
        "note",
        "notes",
        "created_at",
      ].join(","),
    )
    .not("sent_to_reception_at", "is", null)
    .is("exit_at", null)
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

  const [guestsResult, campsResult] = await Promise.all([
    guestIds.length > 0
      ? supabase
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
          .returns<GuestRow[]>()
      : Promise.resolve({ data: [], error: null }),

    campIds.length > 0
      ? supabase
          .from("camps")
          .select("id,name,code,location")
          .in("id", campIds)
          .is("deleted_at", null)
          .returns<CampRow[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (guestsResult.error) {
    throw new Error(
      `Failed to load handoff guest records: ${guestsResult.error.message}`,
    );
  }

  if (campsResult.error) {
    throw new Error(
      `Failed to load handoff camp records: ${campsResult.error.message}`,
    );
  }

  const guestsById = new Map<string, GuestRow>();
  const campsById = new Map<string, CampRow>();

  for (const guest of guestsResult.data ?? []) {
    guestsById.set(guest.id, guest);
  }

  for (const camp of campsResult.data ?? []) {
    campsById.set(camp.id, camp);
  }

  return eventRows.map((event) => ({
    event,
    guest: guestsById.get(event.guest_id) ?? null,
    camp: campsById.get(event.camp_id) ?? null,
  }));
}

function CompactSummary({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "default" | "warning" | "danger";
}): React.JSX.Element {
  const toneClass = {
    default: "border-border bg-surface",
    warning: "border-warning-700/25 bg-warning-50",
    danger: "border-danger-600/25 bg-danger-50",
  }[tone];

  return (
    <div className={cn("rounded-2xl border px-4 py-3", toneClass)}>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>

      <div className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground">
        {value}
      </div>

      <div className="mt-0.5 text-xs leading-5 text-muted">{hint}</div>
    </div>
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
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-bold",
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
    <Card variant="card">
      <CardContent className="p-4">
        <form
          action={APP_ROUTES.reception.securityHandoffs}
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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
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
        className="btn-primary btn-sm"
      >
        Start check-in
      </Link>
    </div>
  );
}

function HandoffEmptyState(): React.JSX.Element {
  return (
    <UiEmptyState
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
    return <HandoffEmptyState />;
  }

  return (
    <div className="grid gap-3">
      {handoffs.map((item) => {
        const event = item.event;
        const guest = item.guest;
        const securityNote = getSecurityNote(event);

        return (
          <Card key={event.id} variant="card">
            <CardContent className="p-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge item={item} />
                    <VisitTypeBadge visitType={event.visit_type} />
                    <ClearanceStatusBadge status={event.clearance_status} />
                    <RiskLevelBadge riskLevel={event.risk_level} />
                  </div>

                  <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.35fr)]">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold tracking-[-0.025em] text-foreground">
                        {getGuestName(item)}
                      </h2>

                      <p className="mt-1 text-sm leading-6 text-muted">
                        {getGuestContext(item)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Waiting
                      </div>

                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {formatWaitingTime(event.sent_to_reception_at)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-surface-2 px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Camp
                      </div>

                      <div className="mt-1 truncate text-sm font-medium text-foreground">
                        {item.camp
                          ? `${item.camp.name} (${item.camp.code})`
                          : "Unknown camp"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-surface-2 px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Sent
                      </div>

                      <div className="mt-1 text-sm font-medium text-foreground">
                        {formatDateTime(event.sent_to_reception_at)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-surface-2 px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Host
                      </div>

                      <div className="mt-1 truncate text-sm font-medium text-foreground">
                        {event.host_name ?? "Not recorded"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-surface-2 px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Contact
                      </div>

                      <div className="mt-1 truncate text-sm font-medium text-foreground">
                        {guest?.phone ?? guest?.email ?? "Not recorded"}
                      </div>
                    </div>
                  </div>

                  {event.purpose ? (
                    <div className="mt-3 rounded-2xl border border-border px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                        Purpose
                      </div>

                      <div className="mt-1 text-sm leading-6 text-foreground-soft">
                        {event.purpose}
                      </div>
                    </div>
                  ) : null}

                  {securityNote ? (
                    <div className="mt-3 rounded-2xl border border-warning-700/20 bg-warning-50 px-4 py-3">
                      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-warning-700">
                        Security note
                      </div>

                      <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-warning-700">
                        {securityNote}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-border pt-4 xl:min-w-[30rem] xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                  <HandoffActionLinks item={item} />
                </div>
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
  await requirePermission("reception.handle_security_handoffs");
  await requirePermission("guests.view");

  const resolvedSearchParams: PageSearchParams = searchParams
    ? await searchParams
    : {};

  const q = normalizeFilterValue(getFirstParam(resolvedSearchParams.q));
  const visitType =
    normalizeFilterValue(getFirstParam(resolvedSearchParams.visitType)) ||
    "all";
  const risk =
    normalizeFilterValue(getFirstParam(resolvedSearchParams.risk)) || "all";

  const handoffs = await getReceptionSecurityHandoffs();
  const filteredHandoffs = applyFilters({
    handoffs,
    q,
    visitType,
    risk,
  });

  const highRiskCount = handoffs.filter(isHighRisk).length;
  const priorityCount = handoffs.filter(isVipOrDelegate).length;
  const staleCount = handoffs.filter(isStaleHandoff).length;

  return (
    <div className="page-stack">
      <section className="surface-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl">
              Security handoffs
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Guests cleared and sent forward by security, waiting for reception
              handling.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[34rem]">
            <CompactSummary
              label="Waiting"
              value={handoffs.length}
              hint="Unlinked handoffs"
            />

            <CompactSummary
              label="Filtered"
              value={filteredHandoffs.length}
              hint="Current view"
            />

            <CompactSummary
              label="Priority"
              value={priorityCount}
              hint="VIP / delegates"
              tone={priorityCount > 0 ? "warning" : "default"}
            />

            <CompactSummary
              label="High risk"
              value={highRiskCount}
              hint="Needs care"
              tone={highRiskCount > 0 ? "danger" : "default"}
            />
          </div>
        </div>
      </section>

      {staleCount > 0 ? (
        <div className="alert alert-danger">
          {staleCount} handoff{staleCount === 1 ? "" : "s"} have been waiting
          for more than two hours.
        </div>
      ) : null}

      <FilterPanel q={q} visitType={visitType} risk={risk} />

      <Card variant="card">
        <CardHeader>
          <CardTitle>Reception handling queue</CardTitle>
          <CardDescription>
            Start the correct receptionist workflow from each security handoff.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <HandoffQueue handoffs={filteredHandoffs} />
        </CardContent>
      </Card>
    </div>
  );
}
