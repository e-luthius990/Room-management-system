import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Enums } from "@/lib/db/types";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ClearanceEventForm } from "@/components/security/clearance-event-form";
import { GateEntryForm } from "@/components/security/gate-entry-form";
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

type GuestCategory = Enums<"guest_category">;
type StayStatus = Enums<"stay_status">;

type PageSearchParams = {
  error?: string | string[];
  success?: string | string[];
};

type SecurityGuestPageProps = {
  params: Promise<{
    guestId: string;
  }>;
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

type SecurityGuestDetail = {
  id: string;
  full_name: string;
  primary_camp_id: string | null;
  primary_camp_name: string;
  guest_category: GuestCategory;
  organization_name: string | null;
  organization: string | null;
  nationality: string | null;
  security_clearance_status: string | null;
  last_seen_at: string | null;
  created_at: string;
};

type SecurityClearanceEventItem = {
  id: string;
  previous_status: string | null;
  new_status: string | null;
  clearance_status: string;
  risk_level: string | null;
  notes: string | null;
  expires_at: string | null;

  event_type: string | null;
  visit_type: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  entry_at: string | null;
  exit_at: string | null;
  sent_to_reception_at: string | null;

  created_at: string;
  created_by_name: string | null;
};

type SecurityGuestStayItem = {
  id: string;
  room_number: string;
  building_name: string;
  camp_name: string;
  status: StayStatus;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
};

type SecurityGuestPresenceSummary = {
  latest_security_event_id: string | null;
  latest_event_type: string | null;
  latest_visit_type: string | null;
  latest_entry_at: string | null;
  latest_exit_at: string | null;
  latest_sent_to_reception_at: string | null;
  is_currently_inside: boolean;
  is_pending_reception: boolean;
};

type SecurityGuestDetailResult = {
  guest: SecurityGuestDetail;
  presence: SecurityGuestPresenceSummary;
  events: SecurityClearanceEventItem[];
  stays: SecurityGuestStayItem[];
};

type GuestRow = {
  id: string;
  full_name: string | null;
  primary_camp_id: string | null;
  guest_category: GuestCategory;
  organization: string | null;
  nationality: string | null;
  security_clearance_status: string | null;
  last_seen_at: string | null;
  created_at: string | null;
};

type CampRow = {
  id: string;
  name: string | null;
};

type SecurityClearanceEventRow = {
  id: string;
  previous_status: string | null;
  new_status: string | null;
  clearance_status: string | null;
  risk_level: string | null;
  note: string | null;
  notes: string | null;
  expires_at: string | null;

  event_type: string | null;
  visit_type: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  entry_at: string | null;
  exit_at: string | null;
  sent_to_reception_at: string | null;

  created_at: string | null;
  created_by: string | null;
};

type StayRow = {
  id: string;
  status: StayStatus;
  room_id: string | null;
  camp_id: string | null;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type RoomRow = {
  id: string;
  room_number: string | null;
  building_id: string | null;
};

type BuildingRow = {
  id: string;
  name: string | null;
};

type RoomLookup = {
  room_number: string | null;
  building_id: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function uniqueStrings(
  values: ReadonlyArray<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function toRequiredText(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
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

function getFirstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
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

function getSuccessMessage(success?: string): string | null {
  if (!success) {
    return null;
  }

  const messages: Record<string, string> = {
    clearance_updated: "Security clearance updated successfully.",
    gate_entry_recorded: "Gate entry recorded successfully.",
    sent_to_reception: "Guest sent to reception successfully.",
    gate_exit_recorded: "Gate exit recorded successfully.",
  };

  return messages[success] ?? null;
}

function getBuildingName(
  room: RoomLookup | undefined,
  buildingsById: Map<string, string>,
): string {
  if (!room?.building_id) {
    return "Unknown building";
  }

  return buildingsById.get(room.building_id) ?? "Unknown building";
}

function isCurrentlyInside(
  event: SecurityClearanceEventRow | undefined,
): boolean {
  return Boolean(event?.entry_at) && !event?.exit_at;
}

function isPendingReception(
  event: SecurityClearanceEventRow | undefined,
): boolean {
  return (
    event?.event_type === "sent_to_reception" &&
    Boolean(event.sent_to_reception_at) &&
    !event.exit_at
  );
}

function getStayStatusClass(status: string): string {
  switch (status) {
    case "checked_in":
    case "occupied":
      return "status-occupied";

    case "reserved":
      return "status-reserved";

    case "completed":
      return "status-vacant-ready";

    case "cancelled":
    case "no_show":
      return "status-muted";

    case "transferred":
      return "status-reserved";

    default:
      return "status-muted";
  }
}

async function getSecurityGuestDetail(
  guestId: string,
): Promise<SecurityGuestDetailResult> {
  if (!isUuid(guestId)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select(
      [
        "id",
        "full_name",
        "primary_camp_id",
        "guest_category",
        "organization",
        "nationality",
        "security_clearance_status",
        "last_seen_at",
        "created_at",
      ].join(","),
    )
    .eq("id", guestId)
    .is("archived_at", null)
    .returns<GuestRow[]>()
    .maybeSingle();

  if (guestError) {
    throw new Error(
      `Failed to load guest security profile: ${guestError.message}`,
    );
  }

  if (!guest) {
    notFound();
  }

  const primaryCampResult = guest.primary_camp_id
    ? await supabase
        .from("camps")
        .select("id,name")
        .eq("id", guest.primary_camp_id)
        .is("deleted_at", null)
        .returns<CampRow[]>()
        .maybeSingle()
    : { data: null, error: null };

  if (primaryCampResult.error) {
    throw new Error(
      `Failed to load guest primary camp: ${primaryCampResult.error.message}`,
    );
  }

  const [eventsResult, staysResult] = await Promise.all([
    supabase
      .from("security_clearance_events")
      .select(
        [
          "id",
          "previous_status",
          "new_status",
          "clearance_status",
          "risk_level",
          "note",
          "notes",
          "expires_at",
          "event_type",
          "visit_type",
          "purpose",
          "host_name",
          "host_department",
          "entry_at",
          "exit_at",
          "sent_to_reception_at",
          "created_at",
          "created_by",
        ].join(","),
      )
      .eq("guest_id", guest.id)
      .order("created_at", {
        ascending: false,
        nullsFirst: false,
      })
      .returns<SecurityClearanceEventRow[]>(),

    supabase
      .from("stays")
      .select(
        [
          "id",
          "status",
          "room_id",
          "camp_id",
          "expected_arrival_at",
          "expected_departure_at",
          "checked_in_at",
          "checked_out_at",
        ].join(","),
      )
      .eq("guest_id", guest.id)
      .order("expected_arrival_at", {
        ascending: false,
        nullsFirst: false,
      })
      .returns<StayRow[]>(),
  ]);

  if (eventsResult.error) {
    throw new Error(
      `Failed to load security clearance events: ${eventsResult.error.message}`,
    );
  }

  if (staysResult.error) {
    throw new Error(
      `Failed to load guest stay history: ${staysResult.error.message}`,
    );
  }

  const eventRows = eventsResult.data ?? [];
  const stayRows = staysResult.data ?? [];

  const latestEvent = eventRows[0];
  const latestOpenEntryEvent = eventRows.find(isCurrentlyInside);
  const latestPendingReceptionEvent = eventRows.find(isPendingReception);

  const createdByIds = uniqueStrings(
    eventRows.map((event) => event.created_by),
  );
  const roomIds = uniqueStrings(stayRows.map((stay) => stay.room_id));
  const campIds = uniqueStrings(stayRows.map((stay) => stay.camp_id));

  const profileNamesById = new Map<string, string>();
  const roomById = new Map<string, RoomLookup>();
  const buildingNamesById = new Map<string, string>();
  const campNamesById = new Map<string, string>();

  if (createdByIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", createdByIds)
      .returns<ProfileRow[]>();

    if (profilesError) {
      throw new Error(
        `Failed to load security event profiles: ${profilesError.message}`,
      );
    }

    for (const profile of profiles ?? []) {
      profileNamesById.set(
        profile.id,
        toRequiredText(profile.full_name, "Unknown user"),
      );
    }
  }

  if (campIds.length > 0) {
    const { data: camps, error: campsError } = await supabase
      .from("camps")
      .select("id,name")
      .in("id", campIds)
      .is("deleted_at", null)
      .returns<CampRow[]>();

    if (campsError) {
      throw new Error(`Failed to load guest stay camps: ${campsError.message}`);
    }

    for (const camp of camps ?? []) {
      campNamesById.set(camp.id, toRequiredText(camp.name, "Unknown camp"));
    }
  }

  if (roomIds.length > 0) {
    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("id,room_number,building_id")
      .in("id", roomIds)
      .is("deleted_at", null)
      .returns<RoomRow[]>();

    if (roomsError) {
      throw new Error(`Failed to load guest stay rooms: ${roomsError.message}`);
    }

    for (const room of rooms ?? []) {
      roomById.set(room.id, {
        room_number: room.room_number,
        building_id: room.building_id,
      });
    }

    const buildingIds = uniqueStrings(
      (rooms ?? []).map((room) => room.building_id),
    );

    if (buildingIds.length > 0) {
      const { data: buildings, error: buildingsError } = await supabase
        .from("buildings")
        .select("id,name")
        .in("id", buildingIds)
        .is("deleted_at", null)
        .returns<BuildingRow[]>();

      if (buildingsError) {
        throw new Error(
          `Failed to load guest stay buildings: ${buildingsError.message}`,
        );
      }

      for (const building of buildings ?? []) {
        buildingNamesById.set(
          building.id,
          toRequiredText(building.name, "Unknown building"),
        );
      }
    }
  }

  return {
    guest: {
      id: guest.id,
      full_name: toRequiredText(guest.full_name, "Unknown guest"),
      primary_camp_id: guest.primary_camp_id,
      primary_camp_name: toRequiredText(
        primaryCampResult.data?.name ?? null,
        "Unknown camp",
      ),
      guest_category: guest.guest_category,
      organization_name: guest.organization,
      organization: guest.organization,
      nationality: guest.nationality,
      security_clearance_status:
        latestEvent?.clearance_status ??
        latestEvent?.new_status ??
        guest.security_clearance_status,
      last_seen_at: guest.last_seen_at,
      created_at: guest.created_at ?? "",
    },

    presence: {
      latest_security_event_id:
        latestOpenEntryEvent?.id ??
        latestPendingReceptionEvent?.id ??
        latestEvent?.id ??
        null,
      latest_event_type:
        latestOpenEntryEvent?.event_type ??
        latestPendingReceptionEvent?.event_type ??
        latestEvent?.event_type ??
        null,
      latest_visit_type:
        latestOpenEntryEvent?.visit_type ??
        latestPendingReceptionEvent?.visit_type ??
        latestEvent?.visit_type ??
        null,
      latest_entry_at:
        latestOpenEntryEvent?.entry_at ?? latestEvent?.entry_at ?? null,
      latest_exit_at: latestEvent?.exit_at ?? null,
      latest_sent_to_reception_at:
        latestPendingReceptionEvent?.sent_to_reception_at ??
        latestEvent?.sent_to_reception_at ??
        null,
      is_currently_inside: Boolean(latestOpenEntryEvent),
      is_pending_reception: Boolean(latestPendingReceptionEvent),
    },

    events: eventRows.map((event) => ({
      id: event.id,
      previous_status: event.previous_status,
      new_status: event.new_status,
      clearance_status: toRequiredText(
        event.clearance_status ?? event.new_status,
        "unknown",
      ),
      risk_level: event.risk_level,
      notes: event.notes ?? event.note,
      expires_at: event.expires_at,

      event_type: event.event_type,
      visit_type: event.visit_type,
      purpose: event.purpose,
      host_name: event.host_name,
      host_department: event.host_department,
      entry_at: event.entry_at,
      exit_at: event.exit_at,
      sent_to_reception_at: event.sent_to_reception_at,

      created_at: event.created_at ?? "",
      created_by_name: event.created_by
        ? (profileNamesById.get(event.created_by) ?? "Unknown user")
        : null,
    })),

    stays: stayRows.map((stay) => {
      const room = stay.room_id ? roomById.get(stay.room_id) : undefined;

      return {
        id: stay.id,
        room_number: toRequiredText(room?.room_number, "Unknown room"),
        building_name: getBuildingName(room, buildingNamesById),
        camp_name: stay.camp_id
          ? (campNamesById.get(stay.camp_id) ?? "Unknown camp")
          : "Unknown camp",
        status: stay.status,
        expected_arrival_at: stay.expected_arrival_at,
        expected_departure_at: stay.expected_departure_at,
        checked_in_at: stay.checked_in_at,
        checked_out_at: stay.checked_out_at,
      };
    }),
  };
}

function DetailCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Card variant="card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium leading-6 text-foreground">
        {value}
      </div>
    </div>
  );
}

function PresencePanel({
  presence,
}: {
  presence: SecurityGuestPresenceSummary;
}): React.JSX.Element {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <InfoRow
        label="Current presence"
        value={
          <PresenceBadge
            isInside={presence.is_currently_inside}
            isPendingReception={presence.is_pending_reception}
          />
        }
      />

      <InfoRow
        label="Latest entry"
        value={formatDateTime(presence.latest_entry_at)}
      />

      <InfoRow
        label="Latest exit"
        value={formatDateTime(presence.latest_exit_at)}
      />

      <InfoRow
        label="Reception handoff"
        value={formatDateTime(presence.latest_sent_to_reception_at)}
      />

      <InfoRow
        label="Latest visit type"
        value={<VisitTypeBadge visitType={presence.latest_visit_type} />}
      />

      <InfoRow
        label="Latest event"
        value={formatLabel(presence.latest_event_type)}
      />
    </div>
  );
}

function SecurityActionPanel({
  guest,
  presence,
}: {
  guest: SecurityGuestDetail;
  presence: SecurityGuestPresenceSummary;
}): React.JSX.Element {
  return (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <ClearanceEventForm
        guestId={guest.id}
        currentStatus={guest.security_clearance_status}
        submitLabel="Save clearance decision"
      />

      {presence.is_currently_inside ? (
        <Card variant="card">
          <CardHeader>
            <div className="page-kicker">Gate entry active</div>

            <CardTitle>Guest is already recorded inside camp</CardTitle>

            <CardDescription>
              A new gate entry cannot be opened until the existing entry is
              marked as left from gate operations.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Link href={APP_ROUTES.security.gate} className="btn-primary">
              Open gate operations
            </Link>
          </CardContent>
        </Card>
      ) : guest.primary_camp_id ? (
        <GateEntryForm
          guestId={guest.id}
          campId={guest.primary_camp_id}
          guestName={guest.full_name}
          campName={guest.primary_camp_name}
          currentClearanceStatus={guest.security_clearance_status}
        />
      ) : (
        <Card variant="card">
          <CardHeader>
            <div className="page-kicker">Gate entry unavailable</div>

            <CardTitle>Guest has no primary camp</CardTitle>

            <CardDescription>
              A primary camp is required before security can record a gate entry
              for this guest.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  );
}

function EventsTable({
  events,
}: {
  events: SecurityClearanceEventItem[];
}): React.JSX.Element {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No security events recorded"
        description="Clearance decisions, gate movements, and reception handoffs will appear here once recorded."
      />
    );
  }

  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[1100px]">
          <thead>
            <tr>
              <th>Event</th>
              <th>Clearance</th>
              <th>Risk</th>
              <th>Visit</th>
              <th>Host</th>
              <th>Movement</th>
              <th>Note</th>
              <th>Recorded</th>
            </tr>
          </thead>

          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>
                  <div className="font-semibold text-foreground">
                    {formatLabel(event.event_type)}
                  </div>

                  <div className="mt-1 text-xs text-muted">
                    By {event.created_by_name ?? "Unknown user"}
                  </div>
                </td>

                <td>
                  <ClearanceStatusBadge status={event.clearance_status} />

                  {event.previous_status || event.new_status ? (
                    <div className="mt-2 text-xs text-muted">
                      {formatLabel(event.previous_status)} →{" "}
                      {formatLabel(event.new_status)}
                    </div>
                  ) : null}
                </td>

                <td>
                  <RiskLevelBadge riskLevel={event.risk_level} />
                </td>

                <td>
                  <VisitTypeBadge visitType={event.visit_type} />

                  {event.purpose ? (
                    <div className="mt-2 max-w-[220px] text-xs leading-5 text-muted">
                      {event.purpose}
                    </div>
                  ) : null}
                </td>

                <td className="text-muted">
                  <div>{event.host_name ?? "—"}</div>

                  {event.host_department ? (
                    <div className="mt-1 text-xs text-muted">
                      {event.host_department}
                    </div>
                  ) : null}
                </td>

                <td className="text-xs leading-5 text-muted">
                  <div>Entry: {formatDateTime(event.entry_at)}</div>
                  <div>
                    Reception: {formatDateTime(event.sent_to_reception_at)}
                  </div>
                  <div>Exit: {formatDateTime(event.exit_at)}</div>
                </td>

                <td className="text-muted">
                  <div className="max-w-[260px] whitespace-pre-wrap text-sm leading-6">
                    {event.notes ?? "—"}
                  </div>
                </td>

                <td className="text-muted">
                  <div>{formatDateTime(event.created_at)}</div>

                  {event.expires_at ? (
                    <div className="mt-1 text-xs text-muted">
                      Expires {formatDateTime(event.expires_at)}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StaysTable({
  stays,
}: {
  stays: SecurityGuestStayItem[];
}): React.JSX.Element {
  if (stays.length === 0) {
    return (
      <EmptyState
        title="No stay history visible"
        description="Room stays linked to this guest will appear here when available to security."
      />
    );
  }

  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[900px]">
          <thead>
            <tr>
              <th>Room</th>
              <th>Camp</th>
              <th>Status</th>
              <th>Expected arrival</th>
              <th>Expected departure</th>
              <th>Checked in</th>
              <th>Checked out</th>
            </tr>
          </thead>

          <tbody>
            {stays.map((stay) => (
              <tr key={stay.id}>
                <td>
                  <div className="font-semibold text-foreground">
                    Room {stay.room_number}
                  </div>

                  <div className="mt-1 text-xs text-muted">
                    {stay.building_name}
                  </div>
                </td>

                <td className="text-muted">{stay.camp_name}</td>

                <td>
                  <StatusIndicator
                    label={formatLabel(stay.status)}
                    statusClassName={getStayStatusClass(stay.status)}
                  />
                </td>

                <td className="text-muted">
                  {formatDateTime(stay.expected_arrival_at)}
                </td>

                <td className="text-muted">
                  {formatDateTime(stay.expected_departure_at)}
                </td>

                <td className="text-muted">
                  {formatDateTime(stay.checked_in_at)}
                </td>

                <td className="text-muted">
                  {formatDateTime(stay.checked_out_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function SecurityGuestProfilePage({
  params,
  searchParams,
}: SecurityGuestPageProps): Promise<React.JSX.Element> {
  await requirePermission("security.view_clearance");
  await requirePermission("guests.view");

  const { guestId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const { guest, presence, events, stays } =
    await getSecurityGuestDetail(guestId);

  const errorMessage = getErrorMessage(
    getFirstSearchParam(resolvedSearchParams.error),
  );

  const successMessage = getSuccessMessage(
    getFirstSearchParam(resolvedSearchParams.success),
  );

  return (
    <div className="page-stack">
      <section className="surface-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="page-kicker">Security profile</div>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl">
              {guest.full_name}
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted">
              Clearance posture, gate presence, event history, and stay context
              for this guest.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href={APP_ROUTES.security.review} className="btn-secondary">
              Security review
            </Link>

            <Link href={APP_ROUTES.security.gate} className="btn-primary">
              Gate operations
            </Link>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoRow
          label="Clearance status"
          value={
            <ClearanceStatusBadge status={guest.security_clearance_status} />
          }
        />

        <InfoRow label="Primary camp" value={guest.primary_camp_name} />

        <InfoRow
          label="Guest category"
          value={formatLabel(guest.guest_category)}
        />

        <InfoRow label="Created" value={formatDateTime(guest.created_at)} />
      </section>

      <SecurityActionPanel guest={guest} presence={presence} />

      <DetailCard title="Guest context">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoRow
            label="Organization"
            value={guest.organization_name ?? "Not recorded"}
          />

          <InfoRow
            label="Nationality"
            value={guest.nationality ?? "Not recorded"}
          />

          <InfoRow
            label="Last seen"
            value={formatDateTime(guest.last_seen_at)}
          />

          <InfoRow label="Guest ID" value={guest.id} />
        </div>
      </DetailCard>

      <DetailCard
        title="Presence summary"
        description="Current security-facing presence state derived from the latest gate and reception events."
      >
        <PresencePanel presence={presence} />
      </DetailCard>

      <DetailCard
        title="Security event history"
        description="Chronological security decisions, gate movements, handoffs, and notes."
      >
        <EventsTable events={events} />
      </DetailCard>

      <DetailCard
        title="Stay context"
        description="Room and stay context visible to security for operational awareness only."
      >
        <StaysTable stays={stays} />
      </DetailCard>
    </div>
  );
}
