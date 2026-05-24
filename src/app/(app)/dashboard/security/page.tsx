import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import type { CurrentUserContext } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SecurityPresenceCard } from "@/components/security/security-presence-card";
import {
  ClearanceStatusBadge,
  PresenceBadge,
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
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageSearchParams = {
  error?: string | string[];
};

type SecurityDashboardPageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

type SummaryTone = "default" | "success" | "warning" | "danger" | "info";

type GuestCategory =
  | "visitor"
  | "contractor"
  | "vip_guest"
  | "long_stay_guest"
  | "eu_delegate"
  | "american_delegate"
  | string;

type SecurityReviewItem = {
  id: string;
  full_name: string;
  primary_camp_id: string | null;
  primary_camp_name: string;
  guest_category: GuestCategory;
  organization_name: string | null;
  organization: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  security_clearance_status: string | null;
  latest_risk_level: string | null;
  latest_security_note: string | null;
  latest_security_event_at: string | null;
  latest_security_event_id: string | null;
  latest_event_type: string | null;
  latest_visit_type: string | null;
  latest_entry_at: string | null;
  latest_exit_at: string | null;
  latest_sent_to_reception_at: string | null;
  latest_purpose: string | null;
  latest_host_name: string | null;
  latest_host_department: string | null;
  is_currently_inside: boolean;
  is_pending_reception: boolean;
  last_seen_at: string | null;
  created_at: string;
};

type GatePresenceItem = {
  security_event_id: string;
  handoff_event_id?: string | null;
  guest_id: string;
  guest_name: string;
  guest_category: GuestCategory | null;
  organization_name: string | null;
  security_clearance_status: string | null;
  camp_name: string;
  visit_type: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  entry_at: string | null;
  sent_to_reception_at: string | null;
  latest_sent_to_reception_at?: string | null;
  exit_at: string | null;
};

type SecurityExpectedArrivalRow = {
  expected_arrival_id: string | null;
  guest_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_organization: string | null;
  camp_name: string | null;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  status: string | null;
  is_overdue: boolean | null;
};

type GateActiveStay = {
  stay_id: string;
  guest_id: string;
  guest_name: string;
  guest_category: GuestCategory | null;
  organization_name: string | null;
  security_clearance_status: string | null;
  camp_name: string;
  room_number: string;
  building_name: string;
  status: string;
  checked_in_at: string | null;
  expected_departure_at: string | null;
};

type SecurityDashboardSummary = {
  insideCamp: number;
  activeStays: number;
  departedToday: number;
  highRiskGuests: number;
  expectedArrivals: number;
  pendingClearance: number;
  pendingReception: number;
  restrictedGuests: number;
};

type SecurityDashboardData = {
  summary: SecurityDashboardSummary;
  latestInsideItems: GatePresenceItem[];
  pendingReceptionItems: GatePresenceItem[];
  activeStayItems: GateActiveStay[];
  expectedArrivals: SecurityExpectedArrivalRow[];
  highAttentionItems: SecurityReviewItem[];
  recentSecurityItems: SecurityReviewItem[];
  pendingClearanceItems: SecurityReviewItem[];
};

type RpcError = {
  message: string;
};

type SecurityDashboardRpcClient = {
  rpc(
    fn: "get_security_dashboard_snapshot",
    args: {
      p_camp_ids: string[] | null;
      p_start_at: string;
      p_end_at: string;
      p_now_at: string;
    },
  ): Promise<{
    data: unknown;
    error: RpcError | null;
  }>;
};

const SECURITY_ROUTES = {
  gate: "/security/gate",
  pendingReception: "/security/pending-reception",
  guestProfile: (guestId: string) => `/security/guests/${guestId}`,
} as const;

const OPERATIONAL_TIME_ZONE = "Africa/Kampala";

const SECURITY_DASHBOARD_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.DASHBOARD_DEBUG_TIMING === "true";

function createSecurityDashboardTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!SECURITY_DASHBOARD_TIMING_ENABLED) {
      return;
    }

    console.info(
      `[${scope}] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
    );
  };
}

function getFirstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getOperationalDayBounds(): { start: string; end: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATIONAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    const fallbackStart = new Date();
    fallbackStart.setHours(0, 0, 0, 0);

    const fallbackEnd = new Date(fallbackStart);
    fallbackEnd.setDate(fallbackEnd.getDate() + 1);

    return {
      start: fallbackStart.toISOString(),
      end: fallbackEnd.toISOString(),
    };
  }

  const start = new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getSecurityCampIds(currentUser: CurrentUserContext): string[] | null {
  if (currentUser.isSystemActor) {
    return null;
  }

  const campIds = currentUser.campAccess
    .map((access) => access.camp_id)
    .filter(
      (campId): campId is string =>
        typeof campId === "string" && campId.length > 0,
    );

  return [...new Set(campIds)];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : fallback;
}

function nullableTextValue(value: unknown): string | null {
  const normalized = textValue(value);

  return normalized.length > 0 ? normalized : null;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function booleanValue(value: unknown): boolean {
  return value === true;
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
    timeZone: OPERATIONAL_TIME_ZONE,
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
    invalid_input: "Check the security clearance form and try again.",
    invalid_gate_entry: "Check the gate entry form and try again.",
    invalid_security_event: "Security event was not found or is invalid.",
    guest_not_found: "Guest record was not found.",
    security_event_not_found: "Security event was not found.",
    guest_already_inside:
      "This guest already has an open gate entry and is recorded inside.",
    guest_already_departed: "This guest has already been marked as left.",
    invalid_clearance_status: "Selected clearance status is invalid.",
    invalid_risk_level: "Selected risk level is invalid.",
    invalid_visit_type: "Selected visit type is invalid.",
    security_notes_required:
      "Security notes are required for restricted or high-risk decisions.",
    access_denied: "You do not have access to perform that security action.",
    clearance_update_failed: "Security clearance could not be updated.",
    security_action_failed: "Security action could not be completed.",
  };

  return messages[error] ?? "Security action could not be completed.";
}

function getLatestMovementLabel(guest: SecurityReviewItem): string {
  if (guest.latest_exit_at) {
    return `Left ${formatDateTime(guest.latest_exit_at)}`;
  }

  if (guest.latest_sent_to_reception_at) {
    return `Sent reception ${formatDateTime(guest.latest_sent_to_reception_at)}`;
  }

  if (guest.latest_entry_at) {
    return `Entered ${formatDateTime(guest.latest_entry_at)}`;
  }

  if (guest.latest_security_event_at) {
    return `Reviewed ${formatDateTime(guest.latest_security_event_at)}`;
  }

  return "No security activity";
}

function getGuestContext(guest: SecurityReviewItem): string {
  const parts = [
    guest.organization_name ?? guest.organization,
    guest.nationality,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "No organization recorded";
}

function getExpectedGuestHref(item: SecurityExpectedArrivalRow): string {
  if (item.guest_id) {
    return SECURITY_ROUTES.guestProfile(item.guest_id);
  }

  if (item.expected_arrival_id) {
    return APP_ROUTES.reception.expectedArrivalDetail(item.expected_arrival_id);
  }

  return APP_ROUTES.reception.expectedArrivals;
}

function getExpectedArrivalSubtitle(item: SecurityExpectedArrivalRow): string {
  const hostParts = [item.host_name, item.host_department].filter(Boolean);

  if (hostParts.length > 0) {
    return `${item.camp_name ?? "Unknown camp"} · ${hostParts.join(" · ")}`;
  }

  return `${item.camp_name ?? "Unknown camp"} · ${
    item.purpose ?? "Purpose not set"
  }`;
}

function getExpectedArrivalMeta(item: SecurityExpectedArrivalRow): string {
  const status = formatLabel(item.status ?? "expected");

  if (item.is_overdue) {
    return `Overdue · ${status}`;
  }

  return `${formatDateTime(item.expected_arrival_at)} · ${status}`;
}

function getEmptySecurityDashboardData(): SecurityDashboardData {
  return {
    summary: {
      insideCamp: 0,
      activeStays: 0,
      departedToday: 0,
      highRiskGuests: 0,
      expectedArrivals: 0,
      pendingClearance: 0,
      pendingReception: 0,
      restrictedGuests: 0,
    },
    latestInsideItems: [],
    pendingReceptionItems: [],
    activeStayItems: [],
    expectedArrivals: [],
    highAttentionItems: [],
    recentSecurityItems: [],
    pendingClearanceItems: [],
  };
}

function parseSummary(value: unknown): SecurityDashboardSummary {
  const summary = asRecord(value);

  return {
    insideCamp: numberValue(summary.insideCamp),
    activeStays: numberValue(summary.activeStays),
    departedToday: numberValue(summary.departedToday),
    highRiskGuests: numberValue(summary.highRiskGuests),
    expectedArrivals: numberValue(summary.expectedArrivals),
    pendingClearance: numberValue(summary.pendingClearance),
    pendingReception: numberValue(summary.pendingReception),
    restrictedGuests: numberValue(summary.restrictedGuests),
  };
}

function parsePresenceItem(value: unknown): GatePresenceItem | null {
  const item = asRecord(value);
  const securityEventId = textValue(item.security_event_id);
  const guestId = textValue(item.guest_id);

  if (!securityEventId || !guestId) {
    return null;
  }

  return {
    security_event_id: securityEventId,
    handoff_event_id: nullableTextValue(item.handoff_event_id),
    guest_id: guestId,
    guest_name: textValue(item.guest_name, "Unknown guest"),
    guest_category: nullableTextValue(item.guest_category),
    organization_name: nullableTextValue(item.organization_name),
    security_clearance_status: nullableTextValue(
      item.security_clearance_status,
    ),
    camp_name: textValue(item.camp_name, "Unknown camp"),
    visit_type: nullableTextValue(item.visit_type),
    purpose: nullableTextValue(item.purpose),
    host_name: nullableTextValue(item.host_name),
    host_department: nullableTextValue(item.host_department),
    entry_at: nullableTextValue(item.entry_at),
    sent_to_reception_at: nullableTextValue(item.sent_to_reception_at),
    latest_sent_to_reception_at: nullableTextValue(
      item.latest_sent_to_reception_at,
    ),
    exit_at: nullableTextValue(item.exit_at),
  };
}

function parseReviewItem(value: unknown): SecurityReviewItem | null {
  const item = asRecord(value);
  const id = textValue(item.id);

  if (!id) {
    return null;
  }

  return {
    id,
    full_name: textValue(item.full_name, "Unknown guest"),
    primary_camp_id: nullableTextValue(item.primary_camp_id),
    primary_camp_name: textValue(item.primary_camp_name, "Unknown camp"),
    guest_category: textValue(item.guest_category, "visitor"),
    organization_name: nullableTextValue(item.organization_name),
    organization: nullableTextValue(item.organization),
    nationality: nullableTextValue(item.nationality),
    phone: nullableTextValue(item.phone),
    email: nullableTextValue(item.email),
    security_clearance_status: nullableTextValue(
      item.security_clearance_status,
    ),
    latest_risk_level: nullableTextValue(item.latest_risk_level),
    latest_security_note: nullableTextValue(item.latest_security_note),
    latest_security_event_at: nullableTextValue(item.latest_security_event_at),
    latest_security_event_id: nullableTextValue(item.latest_security_event_id),
    latest_event_type: nullableTextValue(item.latest_event_type),
    latest_visit_type: nullableTextValue(item.latest_visit_type),
    latest_entry_at: nullableTextValue(item.latest_entry_at),
    latest_exit_at: nullableTextValue(item.latest_exit_at),
    latest_sent_to_reception_at: nullableTextValue(
      item.latest_sent_to_reception_at,
    ),
    latest_purpose: nullableTextValue(item.latest_purpose),
    latest_host_name: nullableTextValue(item.latest_host_name),
    latest_host_department: nullableTextValue(item.latest_host_department),
    is_currently_inside: booleanValue(item.is_currently_inside),
    is_pending_reception: booleanValue(item.is_pending_reception),
    last_seen_at: nullableTextValue(item.last_seen_at),
    created_at: textValue(item.created_at, new Date(0).toISOString()),
  };
}

function parseExpectedArrival(
  value: unknown,
): SecurityExpectedArrivalRow | null {
  const item = asRecord(value);

  return {
    expected_arrival_id: nullableTextValue(item.expected_arrival_id),
    guest_id: nullableTextValue(item.guest_id),
    guest_name: nullableTextValue(item.guest_name),
    guest_phone: nullableTextValue(item.guest_phone),
    guest_organization: nullableTextValue(item.guest_organization),
    camp_name: nullableTextValue(item.camp_name),
    expected_arrival_at: nullableTextValue(item.expected_arrival_at),
    expected_departure_at: nullableTextValue(item.expected_departure_at),
    purpose: nullableTextValue(item.purpose),
    host_name: nullableTextValue(item.host_name),
    host_department: nullableTextValue(item.host_department),
    status: nullableTextValue(item.status),
    is_overdue: booleanValue(item.is_overdue),
  };
}

function parseActiveStay(value: unknown): GateActiveStay | null {
  const item = asRecord(value);
  const stayId = textValue(item.stay_id);
  const guestId = textValue(item.guest_id);

  if (!stayId || !guestId) {
    return null;
  }

  return {
    stay_id: stayId,
    guest_id: guestId,
    guest_name: textValue(item.guest_name, "Unknown guest"),
    guest_category: nullableTextValue(item.guest_category),
    organization_name: nullableTextValue(item.organization_name),
    security_clearance_status: nullableTextValue(
      item.security_clearance_status,
    ),
    camp_name: textValue(item.camp_name, "Unknown camp"),
    room_number: textValue(item.room_number, "Unknown room"),
    building_name: textValue(item.building_name, "Unknown building"),
    status: textValue(item.status, "occupied"),
    checked_in_at: nullableTextValue(item.checked_in_at),
    expected_departure_at: nullableTextValue(item.expected_departure_at),
  };
}

function parseSecurityDashboardData(value: unknown): SecurityDashboardData {
  const root = asRecord(value);

  return {
    summary: parseSummary(root.summary),
    latestInsideItems: asArray(root.latestInsideItems).flatMap((item) => {
      const parsed = parsePresenceItem(item);
      return parsed ? [parsed] : [];
    }),
    pendingReceptionItems: asArray(root.pendingReceptionItems).flatMap(
      (item) => {
        const parsed = parsePresenceItem(item);
        return parsed ? [parsed] : [];
      },
    ),
    activeStayItems: asArray(root.activeStayItems).flatMap((item) => {
      const parsed = parseActiveStay(item);
      return parsed ? [parsed] : [];
    }),
    expectedArrivals: asArray(root.expectedArrivals).flatMap((item) => {
      const parsed = parseExpectedArrival(item);
      return parsed ? [parsed] : [];
    }),
    highAttentionItems: asArray(root.highAttentionItems).flatMap((item) => {
      const parsed = parseReviewItem(item);
      return parsed ? [parsed] : [];
    }),
    recentSecurityItems: asArray(root.recentSecurityItems).flatMap((item) => {
      const parsed = parseReviewItem(item);
      return parsed ? [parsed] : [];
    }),
    pendingClearanceItems: asArray(root.pendingClearanceItems).flatMap(
      (item) => {
        const parsed = parseReviewItem(item);
        return parsed ? [parsed] : [];
      },
    ),
  };
}

async function getSecurityDashboardData(
  currentUser: CurrentUserContext,
  mark: (label: string) => void,
): Promise<SecurityDashboardData> {
  const { start, end } = getOperationalDayBounds();
  const now = new Date().toISOString();
  const campIds = getSecurityCampIds(currentUser);

  if (campIds !== null && campIds.length === 0) {
    return getEmptySecurityDashboardData();
  }

  const admin =
    createSupabaseAdminClient() as unknown as SecurityDashboardRpcClient;

  mark("admin client created");

  const { data, error } = await admin.rpc("get_security_dashboard_snapshot", {
    p_camp_ids: campIds,
    p_start_at: start,
    p_end_at: end,
    p_now_at: now,
  });

  mark("security dashboard snapshot loaded");

  if (error) {
    console.error("Failed to load security dashboard snapshot:", error.message);
    return getEmptySecurityDashboardData();
  }

  return parseSecurityDashboardData(data);
}

function SummaryCard({
  title,
  value,
  description,
  tone = "default",
}: {
  title: string;
  value: number;
  description?: string;
  tone?: SummaryTone;
}): React.JSX.Element {
  const toneClass: Record<SummaryTone, string> = {
    default: "border-border bg-surface",
    success: "border-success-600/25 bg-success-50",
    warning: "border-warning-700/25 bg-warning-50",
    danger: "border-danger-600/25 bg-danger-50",
    info: "border-info-600/25 bg-info-50",
  };

  return (
    <article className={cn("rounded-2xl border px-4 py-3", toneClass[tone])}>
      <div className="text-2xl font-semibold tracking-[-0.045em] text-foreground">
        {value}
      </div>

      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {title}
      </div>

      {description ? (
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      ) : null}
    </article>
  );
}

function SecurityHeader({
  data,
}: {
  data: SecurityDashboardData;
}): React.JSX.Element {
  const hasOverdueExpected = data.expectedArrivals.some(
    (item) => item.is_overdue,
  );

  return (
    <section className="surface-panel overflow-hidden">
      <div className="grid gap-4 border-b border-border px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            Live security operations
          </p>

          <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
            Security dashboard
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            Live command view for gate presence, clearance posture, reception
            handoff, expected arrivals, and confirmed exits.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {hasOverdueExpected ? (
            <StatusIndicator
              compact
              tone="danger"
              label="Overdue expected guests"
              withDot
            />
          ) : null}

          <Link href={SECURITY_ROUTES.gate} className="btn-primary">
            Gate operations
          </Link>

          <Link
            href={SECURITY_ROUTES.pendingReception}
            className="btn-secondary"
          >
            Pending reception
          </Link>
        </div>
      </div>
    </section>
  );
}

function AlertPanel({
  guests,
}: {
  guests: SecurityReviewItem[];
}): React.JSX.Element {
  if (guests.length === 0) {
    return (
      <EmptyState
        operational
        align="left"
        size="sm"
        tone="success"
        title="No high-attention security items"
        description="Restricted, high-risk, and pending-reception records will appear here when action is needed."
      />
    );
  }

  return (
    <div className="grid gap-2">
      {guests.map((guest) => (
        <Link
          key={guest.id}
          href={SECURITY_ROUTES.guestProfile(guest.id)}
          className="block border border-border bg-surface px-3 py-3 transition hover:bg-surface-2"
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <PresenceBadge
              isInside={guest.is_currently_inside}
              isPendingReception={guest.is_pending_reception}
            />

            <ClearanceStatusBadge status={guest.security_clearance_status} />

            <RiskLevelBadge riskLevel={guest.latest_risk_level} />
          </div>

          <div className="mt-2 truncate text-sm font-semibold text-foreground">
            {guest.full_name}
          </div>

          <div className="mt-1 truncate text-xs text-muted">
            {getGuestContext(guest)}
          </div>

          <div className="mt-2 text-xs leading-5 text-muted">
            {getLatestMovementLabel(guest)}
          </div>

          {guest.latest_security_note ? (
            <div className="mt-2 line-clamp-2 border border-border bg-surface-2 px-3 py-2 text-xs leading-5 text-muted">
              {guest.latest_security_note}
            </div>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function CompactListPanel({
  title,
  description,
  value,
  tone = "default",
  children,
}: {
  title: string;
  description: string;
  value: number;
  tone?: SummaryTone;
  children: React.ReactNode;
}): React.JSX.Element {
  const toneClass: Record<SummaryTone, string> = {
    default: "bg-surface text-muted",
    success: "bg-success-50/60 text-success-700",
    warning: "bg-warning-50/70 text-warning-700",
    danger: "bg-danger-50/60 text-danger-700",
    info: "bg-info-50/60 text-info-700",
  };

  return (
    <Card variant="console" className="min-w-0">
      <CardHeader className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm">{title}</CardTitle>

            <CardDescription className="mt-1 text-xs leading-5">
              {description}
            </CardDescription>
          </div>

          <div
            className={cn(
              "shrink-0 border border-border px-3 py-1.5 text-sm font-semibold",
              toneClass[tone],
            )}
          >
            {value}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3">{children}</CardContent>
    </Card>
  );
}

function SmallGuestLink({
  href,
  title,
  subtitle,
  meta,
  children,
}: {
  href: string;
  title: string;
  subtitle: string;
  meta?: string;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className="block border border-border bg-surface px-3 py-2.5 transition hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {title}
          </div>

          <div className="mt-1 truncate text-xs text-muted">{subtitle}</div>

          {meta ? (
            <div className="mt-1.5 truncate text-xs text-muted">{meta}</div>
          ) : null}
        </div>

        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </Link>
  );
}

function ExpectedGuestsPanel({
  expectedArrivals,
  value,
}: {
  expectedArrivals: SecurityExpectedArrivalRow[];
  value: number;
}): React.JSX.Element {
  const hasOverdue = expectedArrivals.some((item) => item.is_overdue);

  return (
    <CompactListPanel
      title="Expected guests"
      description="Due today or overdue before reception allocation."
      value={value}
      tone={hasOverdue ? "danger" : "warning"}
    >
      <div className="grid gap-2">
        {expectedArrivals.slice(0, 5).map((item, index) => (
          <SmallGuestLink
            key={
              item.expected_arrival_id ??
              item.guest_id ??
              `${item.guest_name ?? "expected"}-${index}`
            }
            href={getExpectedGuestHref(item)}
            title={item.guest_name ?? "Unnamed guest"}
            subtitle={getExpectedArrivalSubtitle(item)}
            meta={getExpectedArrivalMeta(item)}
          >
            <StatusIndicator
              compact
              withDot={false}
              tone={item.is_overdue ? "danger" : "warning"}
              label={
                item.is_overdue
                  ? "Overdue"
                  : formatLabel(item.status ?? "expected")
              }
            />
          </SmallGuestLink>
        ))}

        {expectedArrivals.length === 0 ? (
          <EmptyState
            operational
            align="left"
            size="sm"
            tone="success"
            title="No expected guests"
            description="Expected arrivals for today and overdue arrivals will appear here."
          />
        ) : null}
      </div>
    </CompactListPanel>
  );
}

function RecentReviewTable({
  guests,
}: {
  guests: SecurityReviewItem[];
}): React.JSX.Element {
  if (guests.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          operational
          align="left"
          title="No guest records available"
          description="Guest security records will appear here once guests are created or cleared at the gate."
        />
      </div>
    );
  }

  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[960px] table-fixed [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5">
          <colgroup>
            <col className="w-[190px]" />
            <col className="w-[130px]" />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
            <col className="w-[100px]" />
            <col className="w-[170px]" />
            <col className="w-[110px]" />
          </colgroup>

          <thead>
            <tr>
              <th className="text-left">Guest</th>
              <th className="text-left">Presence</th>
              <th className="text-left">Visit</th>
              <th className="text-left">Clearance</th>
              <th className="text-left">Risk</th>
              <th className="text-left">Latest movement</th>
              <th className="text-left">Note</th>
            </tr>
          </thead>

          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="align-top">
                <td>
                  <Link
                    href={SECURITY_ROUTES.guestProfile(guest.id)}
                    className="block truncate font-semibold text-foreground underline-offset-4 hover:underline"
                    title={guest.full_name}
                  >
                    {guest.full_name}
                  </Link>

                  <div
                    className="mt-1 line-clamp-2 text-xs leading-5 text-muted"
                    title={getGuestContext(guest)}
                  >
                    {getGuestContext(guest)}
                  </div>

                  <div className="mt-1.5 text-xs text-muted">
                    {formatLabel(guest.guest_category)}
                  </div>
                </td>

                <td>
                  <PresenceBadge
                    isInside={guest.is_currently_inside}
                    isPendingReception={guest.is_pending_reception}
                  />
                </td>

                <td>
                  <div className="flex flex-col items-start gap-1.5">
                    <VisitTypeBadge visitType={guest.latest_visit_type} />

                    {guest.latest_purpose ? (
                      <div
                        className="line-clamp-2 text-xs leading-5 text-muted"
                        title={guest.latest_purpose}
                      >
                        {guest.latest_purpose}
                      </div>
                    ) : null}
                  </div>
                </td>

                <td>
                  <ClearanceStatusBadge
                    status={guest.security_clearance_status}
                  />
                </td>

                <td>
                  <RiskLevelBadge riskLevel={guest.latest_risk_level} />
                </td>

                <td className="text-sm text-muted">
                  <div
                    className="line-clamp-2 leading-5"
                    title={getLatestMovementLabel(guest)}
                  >
                    {getLatestMovementLabel(guest)}
                  </div>

                  {guest.latest_host_name || guest.latest_host_department ? (
                    <div className="mt-1 truncate text-xs text-muted">
                      {[guest.latest_host_name, guest.latest_host_department]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </td>

                <td className="text-sm text-muted">
                  <div
                    className="line-clamp-2 leading-5"
                    title={guest.latest_security_note ?? "—"}
                  >
                    {guest.latest_security_note ?? "—"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function SecurityDashboardPage({
  searchParams,
}: SecurityDashboardPageProps): Promise<React.JSX.Element> {
  noStore();

  const mark = createSecurityDashboardTimer("dashboard:security");

  const currentUser = await requirePermission("security.view_clearance");
  mark("security.view_clearance permission checked");

  await requirePermission("security.view_gate_dashboard");
  mark("security.view_gate_dashboard permission checked");

  await requirePermission("guests.view");
  mark("guests.view permission checked");

  await requirePermission("expected_arrivals.view");
  mark("expected_arrivals.view permission checked");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  mark("search params resolved");

  const data = await getSecurityDashboardData(currentUser, mark);
  mark("security dashboard data prepared");

  const errorMessage = getErrorMessage(
    getFirstSearchParam(resolvedSearchParams.error),
  );

  const hasOverdueExpected = data.expectedArrivals.some(
    (item) => item.is_overdue,
  );

  return (
    <div className="page-stack">
      <SecurityHeader data={data} />

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          title="Inside camp"
          value={data.summary.insideCamp}
          description="Open gate entries"
          tone="success"
        />

        <SummaryCard
          title="Pending reception"
          value={data.summary.pendingReception}
          description="Sent from security"
          tone="info"
        />

        <SummaryCard
          title="Departed today"
          value={data.summary.departedToday}
          description="Confirmed exits"
        />

        <SummaryCard
          title="Expected guests"
          value={data.summary.expectedArrivals}
          description="Due today / overdue"
          tone={hasOverdueExpected ? "danger" : "warning"}
        />

        <SummaryCard
          title="Restricted"
          value={data.summary.restrictedGuests}
          description="Watchlist / denied"
          tone="danger"
        />

        <SummaryCard
          title="High risk"
          value={data.summary.highRiskGuests}
          description="High / critical"
          tone="danger"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18.5rem] xl:items-start">
        <div className="grid min-w-0 gap-5">
          <Card variant="console" className="min-w-0">
            <CardHeader className="border-b border-border px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-sm">Live gate presence</CardTitle>

                  <CardDescription className="mt-1 text-xs leading-5">
                    Latest people recorded inside. Security confirms physical
                    exit when they leave.
                  </CardDescription>
                </div>

                <Link
                  href={SECURITY_ROUTES.gate}
                  className="btn-secondary btn-sm"
                >
                  Open gate
                </Link>
              </div>
            </CardHeader>

            <CardContent className="p-3">
              <div className="grid gap-2">
                {data.latestInsideItems.map((item) => (
                  <SecurityPresenceCard
                    key={item.security_event_id}
                    item={item}
                  />
                ))}

                {data.latestInsideItems.length === 0 ? (
                  <EmptyState
                    operational
                    align="left"
                    size="sm"
                    tone="success"
                    title="No active gate entries"
                    description="When security records a guest entering camp, the guest appears here until marked as left."
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card variant="console" className="min-w-0">
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm">Needs attention</CardTitle>

              <CardDescription className="mt-1 text-xs leading-5">
                Pending reception, restricted clearance, and high-risk
                decisions.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-3">
              <AlertPanel guests={data.highAttentionItems} />
            </CardContent>
          </Card>

          <Card variant="console" className="min-w-0">
            <CardHeader className="border-b border-border px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-sm">Security register</CardTitle>

                  <CardDescription className="mt-1 text-xs leading-5">
                    Prioritized by handoff, restriction, active presence,
                    pending clearance, and latest movement.
                  </CardDescription>
                </div>

                <Link
                  href={SECURITY_ROUTES.gate}
                  className="btn-secondary btn-sm"
                >
                  Manage gate
                </Link>
              </div>
            </CardHeader>

            <CardContent className="min-w-0 p-0">
              <RecentReviewTable guests={data.recentSecurityItems} />
            </CardContent>
          </Card>
        </div>

        <aside className="grid min-w-0 gap-4 xl:sticky xl:top-4">
          <ExpectedGuestsPanel
            expectedArrivals={data.expectedArrivals}
            value={data.summary.expectedArrivals}
          />

          <CompactListPanel
            title="Pending clearance"
            description="Guests whose latest clearance posture still needs review."
            value={data.summary.pendingClearance}
            tone="warning"
          >
            <div className="grid gap-2">
              {data.pendingClearanceItems.slice(0, 5).map((guest) => (
                <SmallGuestLink
                  key={guest.id}
                  href={SECURITY_ROUTES.guestProfile(guest.id)}
                  title={guest.full_name}
                  subtitle={`${guest.primary_camp_name} · ${formatLabel(
                    guest.guest_category,
                  )}`}
                />
              ))}

              {data.pendingClearanceItems.length === 0 ? (
                <EmptyState
                  operational
                  align="left"
                  size="sm"
                  tone="success"
                  title="No pending clearance records"
                  description="Guests needing clearance review will appear here."
                />
              ) : null}
            </div>
          </CompactListPanel>

          <CompactListPanel
            title="Reception handoff"
            description="Guests sent by security who require reception follow-up."
            value={data.summary.pendingReception}
            tone="info"
          >
            <div className="grid gap-2">
              {data.pendingReceptionItems.slice(0, 5).map((item) => (
                <SmallGuestLink
                  key={item.handoff_event_id ?? item.security_event_id}
                  href={SECURITY_ROUTES.guestProfile(item.guest_id)}
                  title={item.guest_name}
                  subtitle={`${item.camp_name} · ${formatLabel(
                    item.visit_type,
                  )}`}
                >
                  <VisitTypeBadge visitType={item.visit_type ?? null} />
                </SmallGuestLink>
              ))}

              {data.pendingReceptionItems.length === 0 ? (
                <EmptyState
                  operational
                  align="left"
                  size="sm"
                  tone="success"
                  title="No guests pending reception"
                  description="Guests sent forward to reception will appear here."
                />
              ) : null}
            </div>
          </CompactListPanel>

          <CompactListPanel
            title="Room presence awareness"
            description="Active stays visible to security for coordination."
            value={data.summary.activeStays}
          >
            <div className="grid gap-2">
              {data.activeStayItems.slice(0, 5).map((stay) => (
                <SmallGuestLink
                  key={stay.stay_id}
                  href={SECURITY_ROUTES.guestProfile(stay.guest_id)}
                  title={stay.guest_name}
                  subtitle={`${stay.camp_name} · ${stay.building_name} / Room ${stay.room_number}`}
                  meta={`Departure: ${formatDateTime(
                    stay.expected_departure_at,
                  )}`}
                />
              ))}

              {data.activeStayItems.length === 0 ? (
                <EmptyState
                  operational
                  align="left"
                  size="sm"
                  title="No active room stays visible"
                  description="Active room stays visible to security will appear here."
                />
              ) : null}
            </div>
          </CompactListPanel>
        </aside>
      </section>
    </div>
  );
}
