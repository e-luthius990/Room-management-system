import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { requireAuth } from "@/lib/auth/require-auth";
import { APP_ROUTES } from "@/lib/auth/routes";
import type { CurrentUserContext } from "@/lib/auth/types";
import type { Database } from "@/lib/db/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { OperationsSearchBox } from "@/components/search/operations-search-box";
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
  guestId?: string;
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

type RpcError = {
  message: string;
};

type GuestIdLookupRow = {
  id: string;
  guest_id: string | null;
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

type ReceptionDashboardAdminClient = SupabaseClient<Database> &
  ReceptionDashboardRpcClient;

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

function textField(
  record: Record<string, unknown>,
  keys: string[],
  fallback = "â€”",
): string {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return fallback;
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
    guestId: textValue(guest.id, ""),
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
    guestId: textValue(guest.id, ""),
    title: guestName,
    subtitle: `Room ${roomNumber} · ${buildingName}`,
    meta: `${formatTime(row.expected_departure_at)} · Due checkout`,
    tone: "warning",
  };
}

function mapPendingReceptionItem(value: unknown): QueueItem {
  const item = asRecord(value);
  const securityEventId = textField(
    item,
    ["security_event_id", "securityEventId"],
    "",
  );
  const visitType = textField(item, ["visit_type", "visitType"], "visitor");
  const hostParts = [
    textField(item, ["host_name", "hostName"], ""),
    textField(item, ["host_department", "hostDepartment"], ""),
  ].filter((hostValue) => hostValue.length > 0);

  const host = hostParts.length > 0 ? hostParts.join(" · ") : "Host not set";
  const camp = textField(item, ["camp_name", "campName"], "Unknown camp");

  return {
    id: securityEventId,
    guestId: textField(item, ["guest_id", "guestId"], ""),
    title: textField(
      item,
      ["guest_full_name", "guestFullName", "guest_name", "guestName"],
      "Unnamed guest",
    ),
    subtitle: `${camp} · ${host}`,
    meta: `${formatTime(
      item.sent_to_reception_at ?? item.sentToReceptionAt,
    )} · ${formatLabel(visitType)}`,
    href: securityEventId ? handoffDetailPath(securityEventId) : undefined,
    badge: formatLabel(
      textField(item, ["clearance_status", "clearanceStatus"], "pending"),
    ),
    tone: "warning",
  };
}

function mapExpectedArrivalItem(value: unknown): QueueItem {
  const item = asRecord(value);
  const expectedArrivalId = textField(
    item,
    ["expected_arrival_id", "expectedArrivalId"],
    "",
  );
  const hostParts = [
    textField(item, ["host_name", "hostName"], ""),
    textField(item, ["host_department", "hostDepartment"], ""),
  ].filter((hostValue) => hostValue.length > 0);

  const isOverdue = booleanValue(item.is_overdue ?? item.isOverdue);

  return {
    id: expectedArrivalId,
    guestId: textField(item, ["guest_id", "guestId"], ""),
    title: textField(item, ["guest_name", "guestName"], "Unnamed guest"),
    subtitle:
      hostParts.length > 0
        ? hostParts.join(" · ")
        : textField(item, ["purpose"], "Purpose not set"),
    meta: `${formatTime(
      item.expected_arrival_at ?? item.expectedArrivalAt,
    )} · ${formatLabel(textField(item, ["status"], "expected"))}`,
    href: expectedArrivalId
      ? APP_ROUTES.reception.expectedArrivalDetail(expectedArrivalId)
      : undefined,
    badge: isOverdue ? "Overdue" : undefined,
    tone: isOverdue ? "danger" : "info",
  };
}

function mapFieldAbsenceItem(value: unknown): QueueItem {
  const item = asRecord(value);
  const fieldAbsenceId = textField(
    item,
    ["field_absence_id", "fieldAbsenceId"],
    "",
  );
  const room = textField(item, ["room_number", "roomNumber"], "No room");
  const destination = textField(item, ["destination"], "Destination not set");
  const isOverdue = booleanValue(item.is_overdue ?? item.isOverdue);
  const daysAway = numberValue(item.days_away ?? item.daysAway);

  return {
    id: fieldAbsenceId,
    guestId: textField(item, ["guest_id", "guestId"], ""),
    title: textField(item, ["guest_name", "guestName"], "Unnamed guest"),
    subtitle: `Room ${room} · ${destination}`,
    meta: isOverdue
      ? `Return overdue · Away ${daysAway} days`
      : `${formatDate(
          item.expected_return_at ?? item.expectedReturnAt,
        )} return · Away ${daysAway} days`,
    href: fieldAbsenceId
      ? APP_ROUTES.fieldAbsences.detail(fieldAbsenceId)
      : undefined,
    badge: isOverdue
      ? "Overdue"
      : formatLabel(textField(item, ["status"], "away")),
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

function needsGuestId(item: QueueItem): boolean {
  return item.id.length > 0 && !item.guestId;
}

async function fillGuestIdsFromTable({
  admin,
  table,
  items,
}: {
  admin: ReceptionDashboardAdminClient;
  table: "expected_arrivals" | "field_absences" | "security_clearance_events";
  items: QueueItem[];
}): Promise<QueueItem[]> {
  const ids = [...new Set(items.filter(needsGuestId).map((item) => item.id))];

  if (ids.length === 0) {
    return items;
  }

  const { data, error } = await admin
    .from(table)
    .select("id,guest_id")
    .in("id", ids)
    .returns<GuestIdLookupRow[]>();

  if (error) {
    console.error(`Failed to load ${table} guest ids:`, error.message);
    return items;
  }

  const guestIdsByItemId = new Map(
    (data ?? [])
      .filter((row) => row.guest_id)
      .map((row) => [row.id, row.guest_id as string]),
  );

  return items.map((item) => ({
    ...item,
    guestId: item.guestId ?? guestIdsByItemId.get(item.id),
  }));
}

async function enrichDashboardQueueGuestIds({
  admin,
  data,
}: {
  admin: ReceptionDashboardAdminClient;
  data: ReceptionistDashboardData;
}): Promise<ReceptionistDashboardData> {
  const [pendingReceptionItems, expectedArrivalItems, fieldAbsenceItems] =
    await Promise.all([
      fillGuestIdsFromTable({
        admin,
        table: "security_clearance_events",
        items: data.pendingReceptionItems,
      }),
      fillGuestIdsFromTable({
        admin,
        table: "expected_arrivals",
        items: data.expectedArrivalItems,
      }),
      fillGuestIdsFromTable({
        admin,
        table: "field_absences",
        items: data.fieldAbsenceItems,
      }),
    ]);

  return {
    ...data,
    pendingReceptionItems,
    expectedArrivalItems,
    fieldAbsenceItems,
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
    createSupabaseAdminClient() as unknown as ReceptionDashboardAdminClient;
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

  const dashboardData = mapSnapshotToDashboardData(data);

  return enrichDashboardQueueGuestIds({
    admin,
    data: dashboardData,
  });
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
    <div className={cn("min-h-[4.15rem] border px-3 py-2.5", toneClass)}>
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

function ReceptionDashboardTopRail(): React.JSX.Element {
  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(12rem,16rem)_minmax(18rem,42rem)_minmax(12rem,1fr)] lg:items-center">
      <div className="min-w-0 ">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Reception
        </p>
      </div>

      <OperationsSearchBox
        scope="reception"
        placeholder="Search guests, rooms, phone, ID..."
      />

      <div className="flex justify-start lg:justify-end">
        <Link href={APP_ROUTES.guests.new} className="btn-primary">
          Add guest
        </Link>
      </div>
    </section>
  );
}

function ReceptionMetricsRow({
  data,
}: {
  data: ReceptionistDashboardData;
}): React.JSX.Element {
  return (
    <section className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
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

      <CompactMetric label="Arrivals" value={data.arrivalsToday} note="Today" />

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
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {item.guestId ? (
                      <GuestNameWithPhoto
                        guestId={item.guestId}
                        name={item.title}
                      />
                    ) : (
                      <div className="truncate text-sm font-semibold text-foreground">
                        {item.title}
                      </div>
                    )}

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
    <aside className="grid min-w-0 content-start gap-4 xl:sticky xl:top-4">
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
      <ReceptionDashboardTopRail />

      <ReceptionMetricsRow data={data} />

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
