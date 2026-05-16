import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type GuestCategory = Enums<"guest_category">;

export type SecurityReviewListItem = {
  id: string;
  full_name: string;
  primary_camp_id: string;
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

type GuestRow = {
  id: string;
  full_name: string | null;
  primary_camp_id: string;
  guest_category: GuestCategory;
  organization: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
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
  guest_id: string;
  event_type: string | null;
  visit_type: string | null;
  clearance_status: string | null;
  risk_level: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  notes: string | null;
  note: string | null;
  entry_at: string | null;
  exit_at: string | null;
  sent_to_reception_at: string | null;
  created_at: string | null;
};

function uniqueStrings(values: ReadonlyArray<string | null>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function toRequiredText(value: string | null, fallback: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

function isCurrentlyInside(
  event: SecurityClearanceEventRow | undefined,
): boolean {
  if (!event) {
    return false;
  }

  return Boolean(event.entry_at) && !event.exit_at;
}

function isPendingReception(
  event: SecurityClearanceEventRow | undefined,
): boolean {
  if (!event) {
    return false;
  }

  return (
    event.event_type === "sent_to_reception" &&
    Boolean(event.sent_to_reception_at) &&
    !event.exit_at
  );
}

export async function getSecurityReviewList(): Promise<
  SecurityReviewListItem[]
> {
  const supabase = await createServerSupabaseClient();

  const { data: guests, error } = await supabase
    .from("guests")
    .select(
      [
        "id",
        "full_name",
        "primary_camp_id",
        "guest_category",
        "organization",
        "nationality",
        "phone",
        "email",
        "security_clearance_status",
        "last_seen_at",
        "created_at",
      ].join(","),
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .returns<GuestRow[]>();

  if (error) {
    throw new Error(`Failed to load security review list: ${error.message}`);
  }

  const guestRows = guests ?? [];

  if (guestRows.length === 0) {
    return [];
  }

  const guestIds = guestRows.map((guest) => guest.id);
  const campIds = uniqueStrings(guestRows.map((guest) => guest.primary_camp_id));

  const campNamesById = new Map<string, string>();

  if (campIds.length > 0) {
    const { data: camps, error: campsError } = await supabase
      .from("camps")
      .select("id,name")
      .in("id", campIds)
      .is("deleted_at", null)
      .returns<CampRow[]>();

    if (campsError) {
      throw new Error(
        `Failed to load security review camps: ${campsError.message}`,
      );
    }

    for (const camp of camps ?? []) {
      campNamesById.set(camp.id, toRequiredText(camp.name, "Unknown camp"));
    }
  }

  const { data: events, error: eventsError } = await supabase
    .from("security_clearance_events")
    .select(
      [
        "id",
        "guest_id",
        "event_type",
        "visit_type",
        "clearance_status",
        "risk_level",
        "purpose",
        "host_name",
        "host_department",
        "notes",
        "note",
        "entry_at",
        "exit_at",
        "sent_to_reception_at",
        "created_at",
      ].join(","),
    )
    .in("guest_id", guestIds)
    .order("created_at", {
      ascending: false,
      nullsFirst: false,
    })
    .returns<SecurityClearanceEventRow[]>();

  if (eventsError) {
    throw new Error(
      `Failed to load security clearance events: ${eventsError.message}`,
    );
  }

  const latestEventByGuest = new Map<string, SecurityClearanceEventRow>();

  for (const event of events ?? []) {
    if (!latestEventByGuest.has(event.guest_id)) {
      latestEventByGuest.set(event.guest_id, event);
    }
  }

  return guestRows.map((guest) => {
    const latestEvent = latestEventByGuest.get(guest.id);

    return {
      id: guest.id,
      full_name: toRequiredText(guest.full_name, "Unknown guest"),
      primary_camp_id: guest.primary_camp_id,
      primary_camp_name:
        campNamesById.get(guest.primary_camp_id) ?? "Unknown camp",
      guest_category: guest.guest_category,
      organization_name: guest.organization,
      organization: guest.organization,
      nationality: guest.nationality,
      phone: guest.phone,
      email: guest.email,
      security_clearance_status:
        latestEvent?.clearance_status ?? guest.security_clearance_status,

      latest_risk_level: latestEvent?.risk_level ?? null,
      latest_security_note: latestEvent?.notes ?? latestEvent?.note ?? null,
      latest_security_event_at: latestEvent?.created_at ?? null,

      latest_security_event_id: latestEvent?.id ?? null,
      latest_event_type: latestEvent?.event_type ?? null,
      latest_visit_type: latestEvent?.visit_type ?? null,
      latest_entry_at: latestEvent?.entry_at ?? null,
      latest_exit_at: latestEvent?.exit_at ?? null,
      latest_sent_to_reception_at:
        latestEvent?.sent_to_reception_at ?? null,
      latest_purpose: latestEvent?.purpose ?? null,
      latest_host_name: latestEvent?.host_name ?? null,
      latest_host_department: latestEvent?.host_department ?? null,

      is_currently_inside: isCurrentlyInside(latestEvent),
      is_pending_reception: isPendingReception(latestEvent),
      last_seen_at: guest.last_seen_at,

      created_at: guest.created_at ?? new Date(0).toISOString(),
    };
  });
}