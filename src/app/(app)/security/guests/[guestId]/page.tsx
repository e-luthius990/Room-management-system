import "server-only";

import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
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

export const dynamic = "force-dynamic";
export const revalidate = 0;

type GuestCategory = Enums<"guest_category">;
type StayStatus = Enums<"stay_status">;

type PageSearchParams = {
  error?: string | string[];
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

function getFirstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the security form and try again.",
    invalid_gate_entry:
      "Complete visit type, host name, purpose of visit, clearance status, and risk level before recording gate entry.",
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

function TextPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <section className="border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold tracking-[-0.015em] text-foreground">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
        ) : null}
      </div>

      <div className="px-4 py-2">{children}</div>
    </section>
  );
}

function LabelValueRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid gap-2 border-b border-border py-2.5 last:border-b-0 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm leading-5 text-foreground">{value}</dd>
    </div>
  );
}

function PresencePanel({
  presence,
}: {
  presence: SecurityGuestPresenceSummary;
}): React.JSX.Element {
  return (
    <dl>
      <LabelValueRow
        label="Presence"
        value={
          <PresenceBadge
            isInside={presence.is_currently_inside}
            isPendingReception={presence.is_pending_reception}
          />
        }
      />

      <LabelValueRow
        label="Entry"
        value={formatDateTime(presence.latest_entry_at)}
      />

      <LabelValueRow
        label="Exit"
        value={formatDateTime(presence.latest_exit_at)}
      />

      <LabelValueRow
        label="Reception"
        value={formatDateTime(presence.latest_sent_to_reception_at)}
      />

      <LabelValueRow
        label="Visit"
        value={<VisitTypeBadge visitType={presence.latest_visit_type} />}
      />

      <LabelValueRow
        label="Event"
        value={formatLabel(presence.latest_event_type)}
      />
    </dl>
  );
}

function GuestContextPanel({
  guest,
}: {
  guest: SecurityGuestDetail;
}): React.JSX.Element {
  return (
    <dl>
      <LabelValueRow
        label="Organization"
        value={guest.organization_name ?? "Not recorded"}
      />

      <LabelValueRow
        label="Nationality"
        value={guest.nationality ?? "Not recorded"}
      />

      <LabelValueRow
        label="Category"
        value={formatLabel(guest.guest_category)}
      />

      <LabelValueRow label="Camp" value={guest.primary_camp_name} />

      <LabelValueRow
        label="Last seen"
        value={formatDateTime(guest.last_seen_at)}
      />

      <LabelValueRow label="Created" value={formatDateTime(guest.created_at)} />
    </dl>
  );
}

function GateActionPanel({
  guest,
  presence,
}: {
  guest: SecurityGuestDetail;
  presence: SecurityGuestPresenceSummary;
}): React.JSX.Element {
  if (presence.is_currently_inside) {
    return (
      <Card variant="console" className="min-w-0">
        <CardHeader className="border-b border-border px-4 py-3">
          <div className="page-kicker">Gate entry active</div>

          <CardTitle className="text-sm">
            Guest is already recorded inside camp
          </CardTitle>

          <CardDescription className="mt-1 text-xs leading-5">
            A new gate entry cannot be opened until the existing entry is marked
            as left from gate operations.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4">
          <Link href={APP_ROUTES.security.gate} className="btn-primary">
            Open gate operations
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (guest.primary_camp_id) {
    return (
      <GateEntryForm
        guestId={guest.id}
        campId={guest.primary_camp_id}
        guestName={guest.full_name}
        campName={guest.primary_camp_name}
        currentClearanceStatus={guest.security_clearance_status}
      />
    );
  }

  return (
    <Card variant="console" className="min-w-0">
      <CardHeader className="border-b border-border px-4 py-3">
        <div className="page-kicker">Gate entry unavailable</div>

        <CardTitle className="text-sm">Guest has no primary camp</CardTitle>

        <CardDescription className="mt-1 text-xs leading-5">
          A primary camp is required before security can record a gate entry for
          this guest.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function RightRail({
  guest,
  presence,
}: {
  guest: SecurityGuestDetail;
  presence: SecurityGuestPresenceSummary;
}): React.JSX.Element {
  return (
    <aside className="grid min-w-0 gap-4 xl:sticky xl:top-4">
      <TextPanel
        title="Guest context"
        description="Profile details used by security while making gate decisions."
      >
        <GuestContextPanel guest={guest} />
      </TextPanel>

      <TextPanel
        title="Presence summary"
        description="Latest gate and reception state for this guest."
      >
        <PresencePanel presence={presence} />
      </TextPanel>
    </aside>
  );
}

function EventsPanel({
  events,
}: {
  events: SecurityClearanceEventItem[];
}): React.JSX.Element {
  return (
    <Card variant="console" className="min-w-0">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="text-sm">Security event history</CardTitle>

        <CardDescription className="mt-1 text-xs leading-5">
          Chronological security decisions, gate movements, handoffs, and notes.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <EventsTable events={events} />
      </CardContent>
    </Card>
  );
}

function StaysPanel({
  stays,
}: {
  stays: SecurityGuestStayItem[];
}): React.JSX.Element {
  return (
    <Card variant="console" className="min-w-0">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="text-sm">Stay context</CardTitle>

        <CardDescription className="mt-1 text-xs leading-5">
          Room and stay context visible to security for operational awareness.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <StaysTable stays={stays} />
      </CardContent>
    </Card>
  );
}

function EventsTable({
  events,
}: {
  events: SecurityClearanceEventItem[];
}): React.JSX.Element {
  if (events.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          title="No security events recorded"
          description="Security decisions, gate movements, and reception handoffs will appear here once recorded."
        />
      </div>
    );
  }

  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[960px] table-fixed [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5">
          <colgroup>
            <col className="w-[150px]" />
            <col className="w-[135px]" />
            <col className="w-[100px]" />
            <col className="w-[145px]" />
            <col className="w-[135px]" />
            <col className="w-[170px]" />
            <col className="w-[145px]" />
            <col className="w-[130px]" />
          </colgroup>

          <thead>
            <tr>
              <th className="text-left">Event</th>
              <th className="text-left">Clearance</th>
              <th className="text-left">Risk</th>
              <th className="text-left">Visit</th>
              <th className="text-left">Host</th>
              <th className="text-left">Movement</th>
              <th className="text-left">Note</th>
              <th className="text-left">Recorded</th>
            </tr>
          </thead>

          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="align-top">
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
                    <div
                      className="mt-2 line-clamp-2 text-xs leading-5 text-muted"
                      title={event.purpose}
                    >
                      {event.purpose}
                    </div>
                  ) : null}
                </td>

                <td className="text-sm text-muted">
                  <div className="truncate">{event.host_name ?? "—"}</div>

                  {event.host_department ? (
                    <div className="mt-1 truncate text-xs text-muted">
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

                <td className="text-sm text-muted">
                  <div
                    className="line-clamp-3 whitespace-pre-wrap leading-5"
                    title={event.notes ?? "—"}
                  >
                    {event.notes ?? "—"}
                  </div>
                </td>

                <td className="text-sm text-muted">
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
      <div className="p-4">
        <EmptyState
          title="No stay history visible"
          description="Room stays linked to this guest will appear here when available to security."
        />
      </div>
    );
  }

  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[860px] table-fixed [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5">
          <colgroup>
            <col className="w-[150px]" />
            <col className="w-[140px]" />
            <col className="w-[120px]" />
            <col className="w-[135px]" />
            <col className="w-[145px]" />
            <col className="w-[135px]" />
            <col className="w-[135px]" />
          </colgroup>

          <thead>
            <tr>
              <th className="text-left">Room</th>
              <th className="text-left">Camp</th>
              <th className="text-left">Status</th>
              <th className="text-left">Expected arrival</th>
              <th className="text-left">Expected departure</th>
              <th className="text-left">Checked in</th>
              <th className="text-left">Checked out</th>
            </tr>
          </thead>

          <tbody>
            {stays.map((stay) => (
              <tr key={stay.id} className="align-top">
                <td>
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    Room
                  </div>

                  <div className="mt-1 text-lg font-semibold tracking-[-0.04em] text-foreground">
                    {stay.room_number}
                  </div>

                  <div className="mt-1 text-xs text-muted">
                    {stay.building_name}
                  </div>
                </td>

                <td className="text-sm text-muted">{stay.camp_name}</td>

                <td>
                  <StatusIndicator
                    label={formatLabel(stay.status)}
                    statusClassName={getStayStatusClass(stay.status)}
                  />
                </td>

                <td className="text-sm text-muted">
                  {formatDateTime(stay.expected_arrival_at)}
                </td>

                <td className="text-sm text-muted">
                  {formatDateTime(stay.expected_departure_at)}
                </td>

                <td className="text-sm text-muted">
                  {formatDateTime(stay.checked_in_at)}
                </td>

                <td className="text-sm text-muted">
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
  noStore();

  await requirePermission("security.view_clearance");
  await requirePermission("guests.view");

  const { guestId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const { guest, presence, events, stays } =
    await getSecurityGuestDetail(guestId);

  const errorMessage = getErrorMessage(
    getFirstSearchParam(resolvedSearchParams.error),
  );

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 border-b border-border px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Security profile
            </p>

            <GuestNameWithPhoto
              guestId={guest.id}
              name={guest.full_name}
              size="lg"
              className="mt-1 text-xl sm:text-2xl"
            />
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="grid min-w-0 gap-5">
          <GateActionPanel guest={guest} presence={presence} />
        </div>

        <RightRail guest={guest} presence={presence} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2 xl:items-start">
        <EventsPanel events={events} />

        <StaysPanel stays={stays} />
      </section>
    </div>
  );
}
