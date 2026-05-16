import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type GuestCategory = Enums<"guest_category">;
type ReservationStatus = Enums<"reservation_status">;
type StayStatus = Enums<"stay_status">;

export type GateExpectedArrival = {
  reservation_id: string;
  guest_id: string | null;
  guest_name: string | null;
  guest_category: GuestCategory | null;
  organization_name: string | null;
  security_clearance_status: string | null;
  camp_name: string;
  room_number: string;
  building_name: string;
  status: ReservationStatus;
  expected_arrival_at: string;
  expected_departure_at: string;
};

export type GateActiveStay = {
  stay_id: string;
  guest_id: string;
  guest_name: string;
  guest_category: GuestCategory | null;
  organization_name: string | null;
  security_clearance_status: string | null;
  camp_name: string;
  room_number: string;
  building_name: string;
  status: StayStatus;
  checked_in_at: string | null;
  expected_departure_at: string | null;
};

export type GatePresenceItem = {
  security_event_id: string;
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
  exit_at: string | null;
};

export type GateDashboardResult = {
  expectedArrivals: GateExpectedArrival[];
  activeStays: GateActiveStay[];
  peopleInside: GatePresenceItem[];
  pendingReception: GatePresenceItem[];
  departedToday: GatePresenceItem[];
};

type ReservationRow = {
  id: string;
  guest_id: string | null;
  room_id: string;
  camp_id: string;
  status: ReservationStatus;
  expected_arrival_at: string;
  expected_departure_at: string;
};

type StayRow = {
  id: string;
  guest_id: string;
  room_id: string;
  camp_id: string;
  status: StayStatus;
  checked_in_at: string | null;
  expected_departure_at: string | null;
};

type SecurityEventRow = {
  id: string;
  guest_id: string;
  camp_id: string;
  event_type: string | null;
  visit_type: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  entry_at: string | null;
  sent_to_reception_at: string | null;
  exit_at: string | null;
};

type GuestRow = {
  id: string;
  full_name: string | null;
  guest_category: GuestCategory | null;
  organization: string | null;
  security_clearance_status: string | null;
};

type CampRow = {
  id: string;
  name: string | null;
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

type GuestLookup = {
  full_name: string | null;
  guest_category: GuestCategory | null;
  organization: string | null;
  security_clearance_status: string | null;
};

type RoomLookup = {
  room_number: string | null;
  building_id: string | null;
};

const EXPECTED_ARRIVAL_STATUSES = [
  "pending",
  "confirmed",
] as const satisfies readonly ReservationStatus[];

const ACTIVE_STAY_STATUSES = [
  "checked_in",
  "occupied",
] as const satisfies readonly StayStatus[];

function uniqueStrings(values: ReadonlyArray<string | null>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function toRequiredText(value: string | null, fallback: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

function getEatDateParts(): {
  year: string;
  month: string;
  day: string;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kampala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
}

function todayWindowEat(): { start: string; end: string } {
  const { year, month, day } = getEatDateParts();
  const date = `${year}-${month}-${day}`;

  return {
    start: `${date}T00:00:00+03:00`,
    end: `${date}T23:59:59+03:00`,
  };
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

function toGatePresenceItem(
  event: SecurityEventRow,
  guestsById: Map<string, GuestLookup>,
  campsById: Map<string, string>,
): GatePresenceItem {
  const guest = guestsById.get(event.guest_id);

  return {
    security_event_id: event.id,
    guest_id: event.guest_id,
    guest_name: toRequiredText(guest?.full_name ?? null, "Unknown guest"),
    guest_category: guest?.guest_category ?? null,
    organization_name: guest?.organization ?? null,
    security_clearance_status: guest?.security_clearance_status ?? null,
    camp_name: campsById.get(event.camp_id) ?? "Unknown camp",
    visit_type: event.visit_type,
    purpose: event.purpose,
    host_name: event.host_name,
    host_department: event.host_department,
    entry_at: event.entry_at,
    sent_to_reception_at: event.sent_to_reception_at,
    exit_at: event.exit_at,
  };
}

export async function getGateDashboard(): Promise<GateDashboardResult> {
  const supabase = await createServerSupabaseClient();
  const { start, end } = todayWindowEat();

  const [
    reservationsResult,
    staysResult,
    peopleInsideResult,
    departedTodayResult,
  ] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        [
          "id",
          "guest_id",
          "room_id",
          "camp_id",
          "status",
          "expected_arrival_at",
          "expected_departure_at",
        ].join(","),
      )
      .in("status", [...EXPECTED_ARRIVAL_STATUSES])
      .gte("expected_arrival_at", start)
      .lte("expected_arrival_at", end)
      .order("expected_arrival_at", { ascending: true })
      .returns<ReservationRow[]>(),

    supabase
      .from("stays")
      .select(
        [
          "id",
          "guest_id",
          "room_id",
          "camp_id",
          "status",
          "checked_in_at",
          "expected_departure_at",
        ].join(","),
      )
      .in("status", [...ACTIVE_STAY_STATUSES])
      .order("checked_in_at", {
        ascending: false,
        nullsFirst: false,
      })
      .returns<StayRow[]>(),

    supabase
      .from("security_clearance_events")
      .select(
        [
          "id",
          "guest_id",
          "camp_id",
          "event_type",
          "visit_type",
          "purpose",
          "host_name",
          "host_department",
          "entry_at",
          "sent_to_reception_at",
          "exit_at",
        ].join(","),
      )
      .is("exit_at", null)
      .not("entry_at", "is", null)
      .order("entry_at", {
        ascending: false,
        nullsFirst: false,
      })
      .returns<SecurityEventRow[]>(),

    supabase
      .from("security_clearance_events")
      .select(
        [
          "id",
          "guest_id",
          "camp_id",
          "event_type",
          "visit_type",
          "purpose",
          "host_name",
          "host_department",
          "entry_at",
          "sent_to_reception_at",
          "exit_at",
        ].join(","),
      )
      .gte("exit_at", start)
      .lte("exit_at", end)
      .order("exit_at", {
        ascending: false,
        nullsFirst: false,
      })
      .returns<SecurityEventRow[]>(),
  ]);

  if (reservationsResult.error) {
    throw new Error(
      `Failed to load expected arrivals: ${reservationsResult.error.message}`,
    );
  }

  if (staysResult.error) {
    throw new Error(`Failed to load active stays: ${staysResult.error.message}`);
  }

  if (peopleInsideResult.error) {
    throw new Error(
      `Failed to load active gate presence: ${peopleInsideResult.error.message}`,
    );
  }

  if (departedTodayResult.error) {
    throw new Error(
      `Failed to load gate departures: ${departedTodayResult.error.message}`,
    );
  }

  const reservationRows = reservationsResult.data ?? [];
  const stayRows = staysResult.data ?? [];
  const peopleInsideRows = peopleInsideResult.data ?? [];
  const departedTodayRows = departedTodayResult.data ?? [];

  const pendingReceptionRows = peopleInsideRows.filter(
    (event) =>
      event.event_type === "sent_to_reception" &&
      Boolean(event.sent_to_reception_at),
  );

  const guestIds = uniqueStrings([
    ...reservationRows.map((reservation) => reservation.guest_id),
    ...stayRows.map((stay) => stay.guest_id),
    ...peopleInsideRows.map((event) => event.guest_id),
    ...departedTodayRows.map((event) => event.guest_id),
  ]);

  const roomIds = uniqueStrings([
    ...reservationRows.map((reservation) => reservation.room_id),
    ...stayRows.map((stay) => stay.room_id),
  ]);

  const campIds = uniqueStrings([
    ...reservationRows.map((reservation) => reservation.camp_id),
    ...stayRows.map((stay) => stay.camp_id),
    ...peopleInsideRows.map((event) => event.camp_id),
    ...departedTodayRows.map((event) => event.camp_id),
  ]);

  const guestsById = new Map<string, GuestLookup>();
  const roomsById = new Map<string, RoomLookup>();
  const campsById = new Map<string, string>();
  const buildingsById = new Map<string, string>();

  if (guestIds.length > 0) {
    const { data: guests, error: guestsError } = await supabase
      .from("guests")
      .select(
        [
          "id",
          "full_name",
          "guest_category",
          "organization",
          "security_clearance_status",
        ].join(","),
      )
      .in("id", guestIds)
      .is("archived_at", null)
      .returns<GuestRow[]>();

    if (guestsError) {
      throw new Error(`Failed to load gate guests: ${guestsError.message}`);
    }

    for (const guest of guests ?? []) {
      guestsById.set(guest.id, {
        full_name: guest.full_name,
        guest_category: guest.guest_category,
        organization: guest.organization,
        security_clearance_status: guest.security_clearance_status,
      });
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
      throw new Error(`Failed to load gate camps: ${campsError.message}`);
    }

    for (const camp of camps ?? []) {
      campsById.set(camp.id, toRequiredText(camp.name, "Unknown camp"));
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
      throw new Error(`Failed to load gate rooms: ${roomsError.message}`);
    }

    for (const room of rooms ?? []) {
      roomsById.set(room.id, {
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
          `Failed to load gate buildings: ${buildingsError.message}`,
        );
      }

      for (const building of buildings ?? []) {
        buildingsById.set(
          building.id,
          toRequiredText(building.name, "Unknown building"),
        );
      }
    }
  }

  return {
    expectedArrivals: reservationRows.map((reservation) => {
      const guest = reservation.guest_id
        ? guestsById.get(reservation.guest_id)
        : undefined;

      const room = roomsById.get(reservation.room_id);

      return {
        reservation_id: reservation.id,
        guest_id: reservation.guest_id,
        guest_name: guest?.full_name ?? null,
        guest_category: guest?.guest_category ?? null,
        organization_name: guest?.organization ?? null,
        security_clearance_status: guest?.security_clearance_status ?? null,
        camp_name: campsById.get(reservation.camp_id) ?? "Unknown camp",
        room_number: toRequiredText(room?.room_number ?? null, "Unknown room"),
        building_name: getBuildingName(room, buildingsById),
        status: reservation.status,
        expected_arrival_at: reservation.expected_arrival_at,
        expected_departure_at: reservation.expected_departure_at,
      };
    }),

    activeStays: stayRows.map((stay) => {
      const guest = guestsById.get(stay.guest_id);
      const room = roomsById.get(stay.room_id);

      return {
        stay_id: stay.id,
        guest_id: stay.guest_id,
        guest_name: toRequiredText(guest?.full_name ?? null, "Unknown guest"),
        guest_category: guest?.guest_category ?? null,
        organization_name: guest?.organization ?? null,
        security_clearance_status: guest?.security_clearance_status ?? null,
        camp_name: campsById.get(stay.camp_id) ?? "Unknown camp",
        room_number: toRequiredText(room?.room_number ?? null, "Unknown room"),
        building_name: getBuildingName(room, buildingsById),
        status: stay.status,
        checked_in_at: stay.checked_in_at,
        expected_departure_at: stay.expected_departure_at,
      };
    }),

    peopleInside: peopleInsideRows.map((event) =>
      toGatePresenceItem(event, guestsById, campsById),
    ),

    pendingReception: pendingReceptionRows.map((event) =>
      toGatePresenceItem(event, guestsById, campsById),
    ),

    departedToday: departedTodayRows.map((event) =>
      toGatePresenceItem(event, guestsById, campsById),
    ),
  };
}