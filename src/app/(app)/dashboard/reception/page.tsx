import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { requireAuth } from "@/lib/auth/require-auth";
import { APP_ROUTES } from "@/lib/auth/routes";
import type { CurrentUserContext } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

const RECEPTION_HANDOFFS_PATH = "/reception/security-handoffs";
const OPERATIONAL_TIME_ZONE = "Africa/Kampala";

const RECEPTION_DASHBOARD_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.DASHBOARD_DEBUG_TIMING === "true";

type QueueItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  href?: string;
  badge?: string;
  tone?: "success" | "info" | "warning" | "danger" | "muted";
};

type ReceptionistDashboardData = {
  arrivalsToday: number;
  departuresToday: number;
  pendingReservations: number;
  activeStays: number;
  pendingReception: number;
  expectedArrivalsActive: number;
  expectedArrivalsToday: number;
  fieldAbsencesActive: number;
  fieldAbsencesOverdue: number;
  arrivals: QueueItem[];
  departures: QueueItem[];
  pendingReceptionItems: QueueItem[];
  expectedArrivalItems: QueueItem[];
  fieldAbsenceItems: QueueItem[];
};

type PendingReceptionHandoffRow = {
  security_event_id: string | null;
  guest_id: string | null;
  guest_full_name: string | null;
  guest_phone: string | null;
  guest_document_number: string | null;
  guest_nationality: string | null;
  camp_id: string | null;
  camp_name: string | null;
  clearance_status: string | null;
  risk_level: string | null;
  visit_type: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  sent_to_reception_at: string | null;
  reception_status: string | null;
};

type ExpectedArrivalDashboardRow = {
  expected_arrival_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_organization: string | null;
  camp_id: string | null;
  camp_name: string | null;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  status: string | null;
  is_overdue: boolean | null;
};

type FieldAbsenceDashboardRow = {
  field_absence_id: string | null;
  stay_id: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_organization: string | null;
  camp_id: string | null;
  camp_name: string | null;
  room_number: string | null;
  departure_at: string | null;
  expected_return_at: string | null;
  destination: string | null;
  reason: string | null;
  status: string | null;
  days_away: number | null;
  days_until_return: number | null;
  is_overdue: boolean | null;
};

type RpcError = {
  message: string;
};

type ReceptionDashboardRpcClient = {
  rpc(
    fn: "get_reception_dashboard_snapshot",
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

function createReceptionDashboardTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!RECEPTION_DASHBOARD_TIMING_ENABLED) {
      return;
    }

    console.info(
      `[${scope}] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
    );
  };
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

function getReceptionCampIds(currentUser: CurrentUserContext): string[] | null {
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

function relatedRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) {
    return asRecord(value[0]);
  }

  return asRecord(value);
}

function textValue(value: unknown, fallback = "—"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : fallback;
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

function formatTime(value: unknown): string {
  if (typeof value !== "string") {
    return "Time not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time not set";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OPERATIONAL_TIME_ZONE,
  }).format(date);
}

function formatDate(value: unknown): string {
  if (typeof value !== "string") {
    return "Date not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: OPERATIONAL_TIME_ZONE,
  }).format(date);
}

function formatLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function handoffDetailPath(securityEventId: string): string {
  return `${RECEPTION_HANDOFFS_PATH}/${securityEventId}`;
}

function getEmptyDashboardData(): ReceptionistDashboardData {
  return {
    arrivalsToday: 0,
    departuresToday: 0,
    pendingReservations: 0,
    activeStays: 0,
    pendingReception: 0,
    expectedArrivalsActive: 0,
    expectedArrivalsToday: 0,
    fieldAbsencesActive: 0,
    fieldAbsencesOverdue: 0,
    arrivals: [],
    departures: [],
    pendingReceptionItems: [],
    expectedArrivalItems: [],
    fieldAbsenceItems: [],
  };
}

function mapReservationArrival(item: unknown): QueueItem {
  const row = asRecord(item);
  const guest = relatedRecord(row.guest);
  const room = relatedRecord(row.room);
  const building = relatedRecord(room.building);

  const id = textValue(row.id);
  const guestName = textValue(guest.full_name, "Unnamed guest");
  const roomNumber = textValue(room.room_number, "No room");
  const buildingName = textValue(building.code, textValue(building.name));
  const status = textValue(row.status, "pending");

  return {
    id,
    title: guestName,
    subtitle: `Room ${roomNumber} · ${buildingName}`,
    meta: `${formatTime(row.expected_arrival_at)} · ${formatLabel(status)}`,
    tone: "info",
  };
}

function mapStayDeparture(item: unknown): QueueItem {
  const row = asRecord(item);
  const guest = relatedRecord(row.guest);
  const room = relatedRecord(row.room);
  const building = relatedRecord(room.building);

  const id = textValue(row.id);
  const guestName = textValue(guest.full_name, "Unnamed guest");
  const roomNumber = textValue(room.room_number, "No room");
  const buildingName = textValue(building.code, textValue(building.name));

  return {
    id,
    title: guestName,
    subtitle: `Room ${roomNumber} · ${buildingName}`,
    meta: `${formatTime(row.expected_departure_at)} · Due checkout`,
    tone: "warning",
  };
}

function mapPendingReceptionItem(value: unknown): QueueItem {
  const item = asRecord(value) as PendingReceptionHandoffRow;
  const securityEventId = textValue(item.security_event_id, "");
  const visitType = textValue(item.visit_type, "visitor");
  const hostParts = [item.host_name, item.host_department]
    .map((hostValue) => textValue(hostValue, ""))
    .filter((hostValue) => hostValue.length > 0);

  const host = hostParts.length > 0 ? hostParts.join(" · ") : "Host not set";
  const camp = textValue(item.camp_name, "Unknown camp");

  return {
    id: securityEventId,
    title: textValue(item.guest_full_name, "Unnamed guest"),
    subtitle: `${camp} · ${host}`,
    meta: `${formatTime(item.sent_to_reception_at)} · ${formatLabel(visitType)}`,
    href: securityEventId ? handoffDetailPath(securityEventId) : undefined,
    badge: formatLabel(textValue(item.clearance_status, "pending")),
    tone: "warning",
  };
}

function mapExpectedArrivalItem(value: unknown): QueueItem {
  const item = asRecord(value) as ExpectedArrivalDashboardRow;
  const expectedArrivalId = textValue(item.expected_arrival_id, "");
  const hostParts = [item.host_name, item.host_department]
    .map((hostValue) => textValue(hostValue, ""))
    .filter((hostValue) => hostValue.length > 0);

  const isOverdue = booleanValue(item.is_overdue);

  return {
    id: expectedArrivalId,
    title: textValue(item.guest_name, "Unnamed guest"),
    subtitle:
      hostParts.length > 0
        ? hostParts.join(" · ")
        : textValue(item.purpose, "Purpose not set"),
    meta: `${formatTime(item.expected_arrival_at)} · ${formatLabel(
      textValue(item.status, "expected"),
    )}`,
    href: expectedArrivalId
      ? APP_ROUTES.reception.expectedArrivalDetail(expectedArrivalId)
      : undefined,
    badge: isOverdue ? "Overdue" : undefined,
    tone: isOverdue ? "danger" : "info",
  };
}

function mapFieldAbsenceItem(value: unknown): QueueItem {
  const item = asRecord(value) as FieldAbsenceDashboardRow;
  const fieldAbsenceId = textValue(item.field_absence_id, "");
  const room = textValue(item.room_number, "No room");
  const destination = textValue(item.destination, "Destination not set");
  const isOverdue = booleanValue(item.is_overdue);
  const daysAway = numberValue(item.days_away);

  return {
    id: fieldAbsenceId,
    title: textValue(item.guest_name, "Unnamed guest"),
    subtitle: `Room ${room} · ${destination}`,
    meta: isOverdue
      ? `Return overdue · Away ${daysAway} days`
      : `${formatDate(item.expected_return_at)} return · Away ${daysAway} days`,
    href: fieldAbsenceId
      ? APP_ROUTES.fieldAbsences.detail(fieldAbsenceId)
      : undefined,
    badge: isOverdue ? "Overdue" : formatLabel(textValue(item.status, "away")),
    tone: isOverdue ? "danger" : "warning",
  };
}

function mapSnapshotToDashboardData(
  snapshot: unknown,
): ReceptionistDashboardData {
  const root = asRecord(snapshot);
  const counts = asRecord(root.counts);

  return {
    arrivalsToday: numberValue(counts.arrivalsToday),
    departuresToday: numberValue(counts.departuresToday),
    pendingReservations: numberValue(counts.pendingReservations),
    activeStays: numberValue(counts.activeStays),
    pendingReception: numberValue(counts.pendingReception),
    expectedArrivalsActive: numberValue(counts.expectedArrivalsActive),
    expectedArrivalsToday: numberValue(counts.expectedArrivalsToday),
    fieldAbsencesActive: numberValue(counts.fieldAbsencesActive),
    fieldAbsencesOverdue: numberValue(counts.fieldAbsencesOverdue),
    arrivals: asArray(root.arrivals).map(mapReservationArrival),
    departures: asArray(root.departures).map(mapStayDeparture),
    pendingReceptionItems: asArray(root.pendingReceptionItems).map(
      mapPendingReceptionItem,
    ),
    expectedArrivalItems: asArray(root.expectedArrivalItems).map(
      mapExpectedArrivalItem,
    ),
    fieldAbsenceItems: asArray(root.fieldAbsenceItems).map(mapFieldAbsenceItem),
  };
}

async function getReceptionistDashboardData(
  currentUser: CurrentUserContext,
  mark: (label: string) => void,
): Promise<ReceptionistDashboardData> {
  const { start, end } = getOperationalDayBounds();
  const now = new Date().toISOString();
  const campIds = getReceptionCampIds(currentUser);

  if (campIds !== null && campIds.length === 0) {
    return getEmptyDashboardData();
  }

  const admin =
    createSupabaseAdminClient() as unknown as ReceptionDashboardRpcClient;
  mark("admin client created");

  const { data, error } = await admin.rpc("get_reception_dashboard_snapshot", {
    p_camp_ids: campIds,
    p_start_at: start,
    p_end_at: end,
    p_now_at: now,
  });
  mark("reception dashboard snapshot loaded");

  if (error) {
    console.error(
      "Failed to load reception dashboard snapshot:",
      error.message,
    );
    return getEmptyDashboardData();
  }

  return mapSnapshotToDashboardData(data);
}

function CompactMetric({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: number;
  note: string;
  tone?: "default" | "warning" | "success" | "danger" | "info";
}): React.JSX.Element {
  const toneClass = {
    default: "border-border bg-surface",
    warning: "border-warning-700/25 bg-warning-50",
    success: "border-success-600/25 bg-success-50",
    danger: "border-danger-700/25 bg-danger-50",
    info: "border-info-700/25 bg-info-50",
  }[tone];

  return (
    <div
      className={cn(
        "min-h-[3.9rem] border px-2.5 py-2",
        "rounded-md",
        toneClass,
      )}
    >
      <div className="truncate text-[9px] font-bold uppercase leading-3 tracking-[0.12em] text-muted">
        {label}
      </div>

      <div className="mt-0.5 text-xl font-semibold leading-6 tracking-[-0.04em] text-foreground">
        {value}
      </div>

      <div className="mt-0.5 truncate text-[11px] leading-4 text-muted">
        {note}
      </div>
    </div>
  );
}

function DashboardHero({
  data,
}: {
  data: ReceptionistDashboardData;
}): React.JSX.Element {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,0.55fr)_minmax(560px,1.45fr)] xl:items-center">
        <div className="min-w-0">
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-[1.65rem]">
            Reception desk
          </h1>

          <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">
            Handoffs, arrivals, field absences, and checkout pressure for the
            active camp.
          </p>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-3 xl:grid-cols-6">
          <CompactMetric
            label="From security"
            value={data.pendingReception}
            note="Pending"
            tone={data.pendingReception > 0 ? "warning" : "default"}
          />

          <CompactMetric
            label="Expected"
            value={data.expectedArrivalsActive}
            note={`${data.expectedArrivalsToday} today`}
            tone={data.expectedArrivalsActive > 0 ? "info" : "default"}
          />

          <CompactMetric
            label="Field away"
            value={data.fieldAbsencesActive}
            note={`${data.fieldAbsencesOverdue} overdue`}
            tone={data.fieldAbsencesOverdue > 0 ? "danger" : "warning"}
          />

          <CompactMetric
            label="Arrivals"
            value={data.arrivalsToday}
            note="Today"
          />

          <CompactMetric
            label="Departures"
            value={data.departuresToday}
            note="Today"
          />

          <CompactMetric
            label="In house"
            value={data.activeStays}
            note="Active"
            tone={data.activeStays > 0 ? "success" : "default"}
          />
        </div>
      </div>
    </section>
  );
}

function QueuePanel({
  title,
  description,
  emptyTitle,
  emptyDescription,
  items,
}: {
  title: string;
  description?: string;
  emptyTitle: string;
  emptyDescription: string;
  items: QueueItem[];
}): React.JSX.Element {
  return (
    <Card variant="console">
      <CardHeader dense className="px-4 sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-xs leading-5">
                {description}
              </CardDescription>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent dense className="p-0">
        {items.length > 0 ? (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 px-4 py-3 transition hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {item.title}
                    </div>

                    {item.badge ? (
                      <StatusIndicator
                        compact
                        withDot={false}
                        tone={item.tone ?? "muted"}
                        label={item.badge}
                      />
                    ) : null}
                  </div>

                  <div className="mt-0.5 truncate text-xs leading-5 text-muted">
                    {item.subtitle}
                  </div>

                  <div className="mt-0.5 text-xs font-semibold leading-5 text-muted">
                    {item.meta}
                  </div>
                </div>

                {item.href ? (
                  <Link
                    href={item.href}
                    className="btn-secondary btn-sm shrink-0"
                  >
                    View
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-4">
            <EmptyState
              operational
              align="left"
              size="sm"
              title={emptyTitle}
              description={emptyDescription}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LiveSideCards({
  data,
}: {
  data: ReceptionistDashboardData;
}): React.JSX.Element {
  return (
    <aside className="space-y-4">
      <QueuePanel
        title="Expected arrivals"
        emptyTitle="No active expected arrivals"
        emptyDescription="Expected arrivals created by reception will appear here."
        items={data.expectedArrivalItems}
      />

      <QueuePanel
        title="Field absences"
        emptyTitle="No active field absences"
        emptyDescription="Field absences will appear here when occupants are marked away."
        items={data.fieldAbsenceItems}
      />
    </aside>
  );
}

function ReceptionistDashboard({
  data,
}: {
  data: ReceptionistDashboardData;
}): React.JSX.Element {
  return (
    <div className="page-stack">
      <DashboardHero data={data} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <QueuePanel
            title="Pending from security"
            description="Guests sent forward by Security and waiting for reception handling."
            emptyTitle="No pending security handoffs"
            emptyDescription="Guests sent from Security will appear here for receptionist follow-up."
            items={data.pendingReceptionItems}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <QueuePanel
              title="Arrivals due today"
              emptyTitle="No arrivals due today"
              emptyDescription="Expected reservation arrivals will appear here once confirmed for today."
              items={data.arrivals}
            />

            <QueuePanel
              title="Departures due today"
              emptyTitle="No departures due today"
              emptyDescription="Departures appear here when their expected checkout is today."
              items={data.departures}
            />
          </div>
        </div>

        <LiveSideCards data={data} />
      </div>
    </div>
  );
}

export default async function DashboardPage(): Promise<React.JSX.Element> {
  noStore();

  const mark = createReceptionDashboardTimer("dashboard:reception");

  const currentUser = await requireAuth();
  mark("requireAuth completed");

  if (currentUser.role.key !== "receptionist") {
    notFound();
  }

  const data = await getReceptionistDashboardData(currentUser, mark);
  mark("dashboard data prepared");

  return <ReceptionistDashboard data={data} />;
}
