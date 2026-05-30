import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";
import type { CurrentUserContext } from "@/lib/auth/types";
import type { Database } from "@/lib/db/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OperationsSearchBox } from "@/components/search/operations-search-box";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
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

type ReceptionHandoffStatusItem = {
  security_event_id: string;
  guest_id: string;
  guest_full_name: string;
  camp_id: string;
  camp_name: string;
  camp_code: string | null;
  visit_type: string | null;
  clearance_status: string | null;
  risk_level: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  sent_to_reception_at: string | null;
  reception_status: string;
  reception_status_label: string;
  reception_received_at: string | null;
  reception_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ReceptionHandoffEventRow = {
  id: string;
  guest_id: string;
  camp_id: string;
  visit_type: string | null;
  clearance_status: string | null;
  risk_level: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  sent_to_reception_at: string | null;
  reception_status: string | null;
  reception_received_at: string | null;
  reception_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ReceptionHandoffGuestRow = {
  id: string;
  full_name: string | null;
};

type ReceptionHandoffCampRow = {
  id: string;
  name: string | null;
  code: string | null;
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
  created_at?: string | null;
  updated_at?: string | null;
  allocated_at?: string | null;
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
  updated_at?: string | null;
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

type SecurityDashboardAdminClient = SupabaseClient<Database> &
  SecurityDashboardRpcClient;

const SECURITY_ROUTES = {
  gate: "/security/gate",
  pendingReception: "/security/pending-reception",
  guestProfile: (guestId: string) => `/security/guests/${guestId}`,
} as const;

const OPERATIONAL_TIME_ZONE = "Africa/Kampala";

const REQUIRED_SECURITY_DASHBOARD_PERMISSIONS = [
  "security.view_clearance",
  "security.view_gate_dashboard",
  "guests.view",
  "expected_arrivals.view",
] as const;

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

function requireDashboardPermissions(currentUser: CurrentUserContext): void {
  const permissions = new Set(currentUser.permissions);

  const hasRequiredPermissions = REQUIRED_SECURITY_DASHBOARD_PERMISSIONS.every(
    (permission) => permissions.has(permission),
  );

  if (!hasRequiredPermissions) {
    redirect(SYSTEM_ROUTES.accessPending);
  }
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

function uniqueTextValues(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function getReceptionStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "received":
      return "Received";

    case "not_received":
      return "Not received";

    case "reservation_created":
      return "Reservation created";

    case "checked_in":
      return "Checked in";

    case "cancelled":
      return "Cancelled";

    default:
      return "Sent to reception";
  }
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
    created_at: nullableTextValue(item.created_at),
    updated_at: nullableTextValue(item.updated_at),
    allocated_at: nullableTextValue(item.allocated_at),
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
    updated_at: nullableTextValue(item.updated_at),
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
  admin: SecurityDashboardAdminClient,
  currentUser: CurrentUserContext,
  mark: (label: string) => void,
): Promise<SecurityDashboardData> {
  const { start, end } = getOperationalDayBounds();
  const now = new Date().toISOString();
  const campIds = getSecurityCampIds(currentUser);

  if (campIds !== null && campIds.length === 0) {
    return getEmptySecurityDashboardData();
  }

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

async function getRecentReceptionHandoffStatuses(
  admin: SecurityDashboardAdminClient,
  currentUser: CurrentUserContext,
): Promise<ReceptionHandoffStatusItem[]> {
  const campIds = getSecurityCampIds(currentUser);

  if (campIds !== null && campIds.length === 0) {
    return [];
  }

  let query = admin
    .from("security_clearance_events")
    .select(
      [
        "id",
        "guest_id",
        "camp_id",
        "visit_type",
        "clearance_status",
        "risk_level",
        "purpose",
        "host_name",
        "host_department",
        "sent_to_reception_at",
        "reception_status",
        "reception_received_at",
        "reception_notes",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("event_type", "sent_to_reception")
    .not("sent_to_reception_at", "is", null);

  if (campIds !== null) {
    query = query.in("camp_id", campIds);
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .order("sent_to_reception_at", { ascending: false })
    .limit(12)
    .returns<ReceptionHandoffEventRow[]>();

  if (error) {
    console.error(
      "Failed to load reception handoff status feed:",
      error.message,
    );
    return [];
  }

  const eventRows = data ?? [];
  const guestIds = uniqueTextValues(eventRows.map((event) => event.guest_id));
  const campIdList = uniqueTextValues(eventRows.map((event) => event.camp_id));

  const [guestsResult, campsResult] = await Promise.all([
    guestIds.length > 0
      ? admin
          .from("guests")
          .select("id,full_name")
          .in("id", guestIds)
          .returns<ReceptionHandoffGuestRow[]>()
      : Promise.resolve({ data: [], error: null }),

    campIdList.length > 0
      ? admin
          .from("camps")
          .select("id,name,code")
          .in("id", campIdList)
          .returns<ReceptionHandoffCampRow[]>()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (guestsResult.error) {
    console.error(
      "Failed to load reception handoff status guests:",
      guestsResult.error.message,
    );
  }

  if (campsResult.error) {
    console.error(
      "Failed to load reception handoff status camps:",
      campsResult.error.message,
    );
  }

  const guestsById = new Map(
    (guestsResult.data ?? []).map((guest) => [guest.id, guest]),
  );
  const campsById = new Map(
    (campsResult.data ?? []).map((camp) => [camp.id, camp]),
  );

  return eventRows.map((event) => {
    const guest = guestsById.get(event.guest_id);
    const camp = campsById.get(event.camp_id);
    const receptionStatus = event.reception_status ?? "pending";

    return {
      security_event_id: event.id,
      guest_id: event.guest_id,
      guest_full_name: guest?.full_name ?? "Unknown guest",
      camp_id: event.camp_id,
      camp_name: camp?.name ?? "Unknown camp",
      camp_code: camp?.code ?? null,
      visit_type: event.visit_type,
      clearance_status: event.clearance_status,
      risk_level: event.risk_level,
      purpose: event.purpose,
      host_name: event.host_name,
      host_department: event.host_department,
      sent_to_reception_at: event.sent_to_reception_at,
      reception_status: receptionStatus,
      reception_status_label: getReceptionStatusLabel(receptionStatus),
      reception_received_at: event.reception_received_at,
      reception_notes: event.reception_notes,
      created_at: event.created_at,
      updated_at: event.updated_at,
    };
  });
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

function SecurityDashboardTopRail(): React.JSX.Element {
  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(12rem,16rem)_minmax(18rem,42rem)_minmax(12rem,1fr)] lg:items-center">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Security Dashboard
        </p>
      </div>

      <OperationsSearchBox
        scope="security"
        placeholder="Search guests by name, phone, ID..."
      />

      <div aria-hidden="true" className="hidden lg:block" />
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

          <GuestNameWithPhoto
            guestId={guest.id}
            name={guest.full_name}
            className="mt-2"
          />

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
  guestId,
  title,
  subtitle,
  meta,
  children,
}: {
  href: string;
  guestId?: string | null;
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
      <div className="grid gap-1.5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {guestId ? (
              <GuestNameWithPhoto guestId={guestId} name={title} />
            ) : (
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                {title}
              </span>
            )}
          </div>

          {children ? <div className="shrink-0">{children}</div> : null}
        </div>

        <div className="truncate text-xs leading-5 text-muted">{subtitle}</div>

        {meta ? (
          <div className="truncate text-xs leading-5 text-muted">{meta}</div>
        ) : null}
      </div>
    </Link>
  );
}

function CompactGatePresenceRow({
  item,
}: {
  item: GatePresenceItem;
}): React.JSX.Element {
  const isPendingReception = Boolean(item.latest_sent_to_reception_at);

  return (
    <Link
      href={SECURITY_ROUTES.guestProfile(item.guest_id)}
      className="block border border-border bg-surface px-3 py-2.5 transition hover:bg-surface-2"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <GuestNameWithPhoto
              guestId={item.guest_id}
              name={item.guest_name}
            />

            <PresenceBadge
              isInside={Boolean(item.entry_at && !item.exit_at)}
              isPendingReception={isPendingReception}
            />
          </div>

          <div className="mt-1 truncate text-xs text-muted">
            {[
              item.organization_name,
              formatLabel(item.visit_type),
              item.camp_name,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>

        <div className="shrink-0 text-right text-xs text-muted">
          {item.latest_sent_to_reception_at ? (
            <span>Sent reception</span>
          ) : item.entry_at ? (
            <span>{formatDateTime(item.entry_at)}</span>
          ) : (
            <span>Inside</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ReceptionHandoffStatusBadge({
  status,
}: {
  status: string | null;
}): React.JSX.Element {
  const normalized = status ?? "pending";

  const label =
    normalized === "received"
      ? "Received"
      : normalized === "not_received"
        ? "Not received"
        : normalized === "reservation_created"
          ? "Reserved"
          : normalized === "stay_created"
            ? "Checked in"
            : normalized === "no_room_required"
              ? "No room"
              : normalized === "cancelled"
                ? "Cancelled"
                : "Sent";

  const tone =
    normalized === "received" ||
    normalized === "reservation_created" ||
    normalized === "stay_created"
      ? "success"
      : normalized === "not_received" || normalized === "cancelled"
        ? "warning"
        : "info";

  return <StatusIndicator compact withDot tone={tone} label={label} />;
}

function getReceptionHandoffStatusMeta(
  item: ReceptionHandoffStatusItem,
): string {
  if (item.reception_received_at) {
    return `${item.reception_status_label}: ${formatDateTime(
      item.reception_received_at,
    )}`;
  }

  return `Sent: ${formatDateTime(item.sent_to_reception_at)}`;
}

function ReceptionHandoffStatusPanel({
  items,
}: {
  items: ReceptionHandoffStatusItem[];
}): React.JSX.Element {
  return (
    <CompactListPanel
      title="Reception status"
      description="Latest handoff outcomes confirmed by reception."
      value={items.length}
      tone="info"
    >
      <div className="grid gap-2">
        {items.map((item) => (
          <SmallGuestLink
            key={item.security_event_id}
            href={SECURITY_ROUTES.guestProfile(item.guest_id)}
            guestId={item.guest_id}
            title={item.guest_full_name}
            subtitle={`${item.camp_name} · ${formatLabel(item.visit_type)}`}
            meta={getReceptionHandoffStatusMeta(item)}
          >
            <ReceptionHandoffStatusBadge status={item.reception_status} />
          </SmallGuestLink>
        ))}

        {items.length === 0 ? (
          <EmptyState
            operational
            align="left"
            size="sm"
            tone="success"
            title="No reception handoff status yet"
            description="Security handoff outcomes will appear here after guests are sent to reception."
          />
        ) : null}
      </div>
    </CompactListPanel>
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
            guestId={item.guest_id}
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
                    className="block min-w-0 text-foreground underline-offset-4 hover:underline"
                    title={guest.full_name}
                  >
                    <GuestNameWithPhoto
                      guestId={guest.id}
                      name={guest.full_name}
                    />
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

  const currentUser = await requireAnyPermission([
    ...REQUIRED_SECURITY_DASHBOARD_PERMISSIONS,
  ]);
  mark("dashboard entry permission checked");

  requireDashboardPermissions(currentUser);
  mark("dashboard permissions checked");

  const admin =
    createSupabaseAdminClient() as unknown as SecurityDashboardAdminClient;
  mark("admin client created");

  const [resolvedSearchParams, data, receptionHandoffStatusItems] =
    await Promise.all([
      Promise.resolve(searchParams ?? {}),
      getSecurityDashboardData(admin, currentUser, mark),
      getRecentReceptionHandoffStatuses(admin, currentUser),
    ]);

  mark("dashboard data and handoff feed prepared");

  const errorMessage = getErrorMessage(
    getFirstSearchParam(resolvedSearchParams.error),
  );

  const hasOverdueExpected = data.expectedArrivals.some(
    (item) => item.is_overdue,
  );

  return (
    <div className="page-stack">
      <SecurityDashboardTopRail />

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

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="grid min-w-0 gap-4">
          <Card variant="console" className="min-w-0">
            <CardHeader className="border-b border-border px-4 py-3">
              <CardTitle className="text-sm">Live gate presence</CardTitle>

              <CardDescription className="mt-1 text-xs leading-5">
                Latest people recorded inside. Security confirms physical exit
                when they leave.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-2.5">
              <div className="grid gap-2">
                {data.latestInsideItems.slice(0, 6).map((item) => (
                  <CompactGatePresenceRow
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
              <CardTitle className="text-sm">Security register</CardTitle>

              <CardDescription className="mt-1 text-xs leading-5">
                Prioritized by handoff, restriction, active presence, pending
                clearance, and latest movement.
              </CardDescription>
            </CardHeader>

            <CardContent className="min-w-0 p-0">
              <RecentReviewTable guests={data.recentSecurityItems} />
            </CardContent>
          </Card>
        </div>

        <aside className="grid min-w-0 content-start gap-3 xl:sticky xl:top-4">
          <ReceptionHandoffStatusPanel items={receptionHandoffStatusItems} />

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
                  guestId={guest.id}
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
                  guestId={item.guest_id}
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
                  guestId={stay.guest_id}
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
