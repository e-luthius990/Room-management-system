import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import type { CurrentUserContext } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { SecurityPresenceCard } from "@/components/security/security-presence-card";
import {
  ClearanceStatusBadge,
  PresenceBadge,
} from "@/components/security/security-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GuestCategory =
  | "visitor"
  | "contractor"
  | "vip_guest"
  | "long_stay_guest"
  | "eu_delegate"
  | "american_delegate"
  | string;

type GateExpectedArrival = {
  reservation_id: string;
  guest_id: string | null;
  guest_name: string | null;
  guest_category: GuestCategory | null;
  organization_name: string | null;
  security_clearance_status: string | null;
  camp_name: string;
  room_number: string;
  building_name: string;
  status: string;
  expected_arrival_at: string;
  expected_departure_at: string;
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

type GateOperationsData = {
  expectedArrivals: GateExpectedArrival[];
  activeStays: GateActiveStay[];
  peopleInside: GatePresenceItem[];
  pendingReception: GatePresenceItem[];
  departedToday: GatePresenceItem[];
};

type RpcError = {
  message: string;
};

type GateOperationsRpcClient = {
  rpc(
    fn: "get_gate_operations_snapshot",
    args: {
      p_camp_ids: string[] | null;
      p_start_at: string;
      p_end_at: string;
    },
  ): Promise<{
    data: unknown;
    error: RpcError | null;
  }>;
};

type PressureTone = "default" | "success" | "warning" | "danger" | "info";

const OPERATIONAL_TIME_ZONE = "Africa/Kampala";

const GATE_OPERATIONS_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.DASHBOARD_DEBUG_TIMING === "true";

function createGateOperationsTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!GATE_OPERATIONS_TIMING_ENABLED) {
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
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseExpectedArrival(value: unknown): GateExpectedArrival | null {
  const item = asRecord(value);
  const reservationId = textValue(item.reservation_id);

  if (!reservationId) {
    return null;
  }

  return {
    reservation_id: reservationId,
    guest_id: nullableTextValue(item.guest_id),
    guest_name: nullableTextValue(item.guest_name),
    guest_category: nullableTextValue(item.guest_category),
    organization_name: nullableTextValue(item.organization_name),
    security_clearance_status: nullableTextValue(
      item.security_clearance_status,
    ),
    camp_name: textValue(item.camp_name, "Unknown camp"),
    room_number: textValue(item.room_number, "Unknown room"),
    building_name: textValue(item.building_name, "Unknown building"),
    status: textValue(item.status, "pending"),
    expected_arrival_at: textValue(item.expected_arrival_at),
    expected_departure_at: textValue(item.expected_departure_at),
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

function parseGateOperationsData(value: unknown): GateOperationsData {
  const root = asRecord(value);

  return {
    expectedArrivals: asArray(root.expectedArrivals).flatMap((item) => {
      const parsed = parseExpectedArrival(item);
      return parsed ? [parsed] : [];
    }),
    activeStays: asArray(root.activeStays).flatMap((item) => {
      const parsed = parseActiveStay(item);
      return parsed ? [parsed] : [];
    }),
    peopleInside: asArray(root.peopleInside).flatMap((item) => {
      const parsed = parsePresenceItem(item);
      return parsed ? [parsed] : [];
    }),
    pendingReception: asArray(root.pendingReception).flatMap((item) => {
      const parsed = parsePresenceItem(item);
      return parsed ? [parsed] : [];
    }),
    departedToday: asArray(root.departedToday).flatMap((item) => {
      const parsed = parsePresenceItem(item);
      return parsed ? [parsed] : [];
    }),
  };
}

function getEmptyGateOperationsData(): GateOperationsData {
  return {
    expectedArrivals: [],
    activeStays: [],
    peopleInside: [],
    pendingReception: [],
    departedToday: [],
  };
}

async function getGateOperationsData(
  currentUser: CurrentUserContext,
  mark: (label: string) => void,
): Promise<GateOperationsData> {
  const campIds = getSecurityCampIds(currentUser);

  if (campIds !== null && campIds.length === 0) {
    return getEmptyGateOperationsData();
  }

  const { start, end } = getOperationalDayBounds();

  const admin =
    createSupabaseAdminClient() as unknown as GateOperationsRpcClient;

  mark("admin client created");

  const { data, error } = await admin.rpc("get_gate_operations_snapshot", {
    p_camp_ids: campIds,
    p_start_at: start,
    p_end_at: end,
  });

  mark("gate operations snapshot loaded");

  if (error) {
    console.error("Failed to load gate operations snapshot:", error.message);
    return getEmptyGateOperationsData();
  }

  return parseGateOperationsData(data);
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
  tone?: PressureTone;
}): React.JSX.Element {
  const toneClass: Record<PressureTone, string> = {
    default: "bg-surface",
    success: "bg-success-50/60",
    warning: "bg-warning-50/70",
    danger: "bg-danger-50/60",
    info: "bg-info-50/60",
  };

  return (
    <article className={cn("px-4 py-3", toneClass[tone])}>
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

function RecordLabel({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string | null;
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold text-foreground">{primary}</div>

      {secondary ? (
        <div className="mt-1 truncate text-xs text-muted">{secondary}</div>
      ) : null}
    </div>
  );
}

function RoomAnchor({
  camp,
  building,
  room,
}: {
  camp: string;
  building: string;
  room: string;
}): React.JSX.Element {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm text-muted">{camp}</div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Room
        </span>

        <span className="text-lg font-semibold tracking-[-0.04em] text-foreground">
          {room}
        </span>
      </div>

      <div className="mt-1 truncate text-xs text-muted">{building}</div>
    </div>
  );
}

function ExpectedArrivalsTable({
  arrivals,
}: {
  arrivals: GateExpectedArrival[];
}): React.JSX.Element {
  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[980px] table-fixed [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[22%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
          </colgroup>

          <thead>
            <tr>
              <th className="text-left">Guest</th>
              <th className="text-left">Camp / Room</th>
              <th className="text-left">Expected arrival</th>
              <th className="text-left">Expected departure</th>
              <th className="text-left">Clearance</th>
              <th className="text-right" />
            </tr>
          </thead>

          <tbody>
            {arrivals.map((arrival) => (
              <tr key={arrival.reservation_id} className="align-top">
                <td>
                  {arrival.guest_id ? (
                    <GuestNameWithPhoto
                      guestId={arrival.guest_id}
                      name={arrival.guest_name ?? "Guest not assigned"}
                    >
                      <span className="mt-1 block truncate text-xs leading-5 text-muted">
                        {arrival.organization_name ??
                          formatLabel(arrival.guest_category)}
                      </span>
                    </GuestNameWithPhoto>
                  ) : (
                    <RecordLabel
                      primary={arrival.guest_name ?? "Guest not assigned"}
                      secondary={
                        arrival.organization_name ??
                        formatLabel(arrival.guest_category)
                      }
                    />
                  )}
                </td>

                <td>
                  <RoomAnchor
                    camp={arrival.camp_name}
                    building={arrival.building_name}
                    room={arrival.room_number}
                  />
                </td>

                <td className="text-sm leading-5 text-muted">
                  <time dateTime={arrival.expected_arrival_at}>
                    {formatDateTime(arrival.expected_arrival_at)}
                  </time>
                </td>

                <td className="text-sm leading-5 text-muted">
                  <time dateTime={arrival.expected_departure_at}>
                    {formatDateTime(arrival.expected_departure_at)}
                  </time>
                </td>

                <td>
                  <ClearanceStatusBadge
                    status={arrival.security_clearance_status}
                  />
                </td>

                <td className="text-right">
                  {arrival.guest_id ? (
                    <Link
                      href={APP_ROUTES.security.guestProfile(arrival.guest_id)}
                      className="btn-secondary btn-sm"
                    >
                      Review
                    </Link>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}

            {arrivals.length === 0 ? (
              <tr className="table-empty-row">
                <td colSpan={6}>No expected arrivals today.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActiveStaysTable({
  stays,
}: {
  stays: GateActiveStay[];
}): React.JSX.Element {
  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[980px] table-fixed [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[22%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
            <col className="w-[12%]" />
            <col className="w-[8%]" />
          </colgroup>

          <thead>
            <tr>
              <th className="text-left">Guest</th>
              <th className="text-left">Camp / Room</th>
              <th className="text-left">Checked in</th>
              <th className="text-left">Expected departure</th>
              <th className="text-left">Clearance</th>
              <th className="text-right" />
            </tr>
          </thead>

          <tbody>
            {stays.map((stay) => (
              <tr key={stay.stay_id} className="align-top">
                <td>
                  <GuestNameWithPhoto
                    guestId={stay.guest_id}
                    name={stay.guest_name}
                  >
                    <span className="mt-1 block truncate text-xs leading-5 text-muted">
                      {stay.organization_name ?? formatLabel(stay.guest_category)}
                    </span>
                  </GuestNameWithPhoto>
                </td>

                <td>
                  <RoomAnchor
                    camp={stay.camp_name}
                    building={stay.building_name}
                    room={stay.room_number}
                  />
                </td>

                <td className="text-sm leading-5 text-muted">
                  <time dateTime={stay.checked_in_at ?? undefined}>
                    {formatDateTime(stay.checked_in_at)}
                  </time>
                </td>

                <td className="text-sm leading-5 text-muted">
                  <time dateTime={stay.expected_departure_at ?? undefined}>
                    {formatDateTime(stay.expected_departure_at)}
                  </time>
                </td>

                <td>
                  <ClearanceStatusBadge
                    status={stay.security_clearance_status}
                  />
                </td>

                <td className="text-right">
                  <Link
                    href={APP_ROUTES.security.guestProfile(stay.guest_id)}
                    className="btn-secondary btn-sm"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}

            {stays.length === 0 ? (
              <tr className="table-empty-row">
                <td colSpan={6}>
                  No active stays currently visible to security.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PresencePanel({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
  showExitAction = true,
  showSendToReceptionAction = true,
}: {
  title: string;
  description: string;
  items: GatePresenceItem[];
  emptyTitle: string;
  emptyDescription: string;
  showExitAction?: boolean;
  showSendToReceptionAction?: boolean;
}): React.JSX.Element {
  return (
    <Card variant="console">
      <CardHeader className="border-b border-border px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <CardTitle>{title}</CardTitle>

            <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
          </div>

          <PresenceBadge isInside={items.length > 0} />
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {items.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {items.map((item) => (
              <SecurityPresenceCard
                key={item.handoff_event_id ?? item.security_event_id}
                item={item}
                showExitAction={showExitAction}
                showSendToReceptionAction={showSendToReceptionAction}
              />
            ))}
          </div>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </CardContent>
    </Card>
  );
}

export default async function GateOperationsPage(): Promise<React.JSX.Element> {
  noStore();

  const mark = createGateOperationsTimer("security:gate");

  const currentUser = await requirePermission("security.view_gate_dashboard");
  mark("security.view_gate_dashboard permission checked");

  await requirePermission("security.view_clearance");
  mark("security.view_clearance permission checked");

  await requirePermission("guests.view");
  mark("guests.view permission checked");

  const gateDashboard = await getGateOperationsData(currentUser, mark);
  mark("gate operations data prepared");

  const expectedArrivals = gateDashboard.expectedArrivals;
  const activeStays = gateDashboard.activeStays;
  const peopleInside = gateDashboard.peopleInside;
  const pendingReception = gateDashboard.pendingReception;
  const departedToday = gateDashboard.departedToday;

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 border-b border-border px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Gate desk
            </p>

            <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
              Gate operations
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Record physical entry, monitor who is inside, send eligible guests
              to reception, and confirm physical exits.
            </p>
          </div>
        </div>

        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
          <PressureCell
            label="Inside"
            value={peopleInside.length}
            hint="Open gate entries"
            tone={peopleInside.length > 0 ? "success" : "default"}
          />

          <PressureCell
            label="Reception"
            value={pendingReception.length}
            hint="Sent forward"
            tone={pendingReception.length > 0 ? "info" : "default"}
          />

          <PressureCell
            label="Arrivals"
            value={expectedArrivals.length}
            hint="Expected today"
            tone={expectedArrivals.length > 0 ? "warning" : "default"}
          />

          <PressureCell
            label="Active stays"
            value={activeStays.length}
            hint="Checked in rooms"
            tone="info"
          />

          <PressureCell
            label="Departed"
            value={departedToday.length}
            hint="Exited today"
            tone={departedToday.length > 0 ? "success" : "default"}
          />
        </div>
      </section>

      <PresencePanel
        title="People currently inside"
        description="Open gate entries. Mark a guest as left once they physically exit."
        items={peopleInside}
        emptyTitle="No one is currently recorded inside"
        emptyDescription="When security records a gate entry, the guest will appear here until marked as left."
      />

      <PresencePanel
        title="Pending reception handoff"
        description="Guests already sent forward to reception for the next handling step."
        items={pendingReception}
        emptyTitle="No guests pending reception"
        emptyDescription="Guests sent from security to reception will appear here for follow-up."
        showSendToReceptionAction={false}
      />

      <Card variant="console">
        <CardHeader className="border-b border-border px-4 py-4">
          <div className="max-w-3xl">
            <CardTitle>Expected arrivals</CardTitle>

            <p className="mt-1 text-sm leading-6 text-muted">
              Reservations expected today with room assignment and clearance
              posture.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ExpectedArrivalsTable arrivals={expectedArrivals} />
        </CardContent>
      </Card>

      <Card variant="console">
        <CardHeader className="border-b border-border px-4 py-4">
          <div className="max-w-3xl">
            <CardTitle>Active room stays</CardTitle>

            <p className="mt-1 text-sm leading-6 text-muted">
              Guests currently checked in or occupying rooms. Physical exit is
              confirmed by security.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ActiveStaysTable stays={activeStays} />
        </CardContent>
      </Card>

      <PresencePanel
        title="Departed today"
        description="Guests whose physical exit was confirmed by security today."
        items={departedToday}
        emptyTitle="No departures recorded today"
        emptyDescription="When security confirms a guest has physically left, the record will appear here."
        showExitAction={false}
        showSendToReceptionAction={false}
      />
    </div>
  );
}
