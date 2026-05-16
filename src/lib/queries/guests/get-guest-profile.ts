import "server-only";

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type GuestCategory =
  | "eu_delegate"
  | "american_delegate"
  | "government_official"
  | "company_staff"
  | "contractor"
  | "consultant"
  | "visitor"
  | "transit_guest"
  | "vip_guest"
  | "long_stay_guest";

export type GuestDocumentStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "active"
  | "archived"
  | "deleted";

type MaybeArrayRelation<T> = T | T[] | null;

function getSingleRelation<T>(relation: MaybeArrayRelation<T>): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

export type GuestProfile = {
  id: string;
  full_name: string;
  primary_camp_id: string;
  primary_camp_name: string;
  guest_category: GuestCategory;
  gender: string | null;
  organization_name: string | null;
  department_or_project: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  id_or_passport_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  is_vip: boolean;
  security_clearance_status: string | null;
  notes: string | null;
  manager_notes: string | null;
  created_at: string;
};

export type GuestStayHistoryItem = {
  id: string;
  room_id: string;
  room_number: string;
  camp_name: string;
  status: string;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
};

export type GuestDocumentItem = {
  id: string;
  document_type: string;
  status: GuestDocumentStatus;
  uploaded_at: string;
  original_filename: string | null;
};

export type GuestProfileResult = {
  guest: GuestProfile;
  stays: GuestStayHistoryItem[];
  documents: GuestDocumentItem[];
};

type CampNameRelation = {
  name: string | null;
};

type RoomStayRelation = {
  room_number: string | null;
  camps: MaybeArrayRelation<CampNameRelation>;
};

type GuestProfileRow = {
  id: string;
  full_name: string;
  primary_camp_id: string;
  guest_category: GuestCategory;
  gender: string | null;
  organization: string | null;
  department_or_project: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  id_or_passport_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  is_vip: boolean;
  security_clearance_status: string | null;
  notes: string | null;
  manager_notes: string | null;
  created_at: string;
  camps: MaybeArrayRelation<CampNameRelation>;
};

type GuestStayHistoryRow = {
  id: string;
  room_id: string;
  status: string;
  expected_arrival_at: string | null;
  expected_departure_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  rooms: MaybeArrayRelation<RoomStayRelation>;
};

type GuestDocumentRow = {
  id: string;
  document_type: string;
  status: GuestDocumentStatus;
  uploaded_at: string;
  original_filename: string | null;
};

export async function getGuestProfile(
  guestId: string,
): Promise<GuestProfileResult> {
  const supabase = await createServerSupabaseClient();

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select(
      [
        "id",
        "full_name",
        "primary_camp_id",
        "guest_category",
        "gender",
        "organization",
        "department_or_project",
        "nationality",
        "phone",
        "email",
        "id_or_passport_number",
        "emergency_contact_name",
        "emergency_contact_phone",
        "is_vip",
        "security_clearance_status",
        "notes",
        "manager_notes",
        "created_at",
        "camps!guests_primary_camp_id_fkey(name)",
      ].join(","),
    )
    .eq("id", guestId)
    .is("archived_at", null)
    .returns<GuestProfileRow[]>()
    .maybeSingle();

  if (guestError) {
    throw new Error(`Failed to load guest: ${guestError.message}`);
  }

  if (!guest) {
    notFound();
  }

  const [
    { data: stays, error: staysError },
    { data: documents, error: documentsError },
  ] = await Promise.all([
    supabase
      .from("stays")
      .select(
        [
          "id",
          "room_id",
          "status",
          "expected_arrival_at",
          "expected_departure_at",
          "checked_in_at",
          "checked_out_at",
          "rooms!inner(room_number,camps!rooms_camp_id_fkey(name))",
        ].join(","),
      )
      .eq("guest_id", guestId)
      .order("expected_arrival_at", {
        ascending: false,
        nullsFirst: false,
      })
      .returns<GuestStayHistoryRow[]>(),

    supabase
      .from("guest_documents")
      .select("id,document_type,status,uploaded_at,original_filename")
      .eq("guest_id", guestId)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false })
      .returns<GuestDocumentRow[]>(),
  ]);

  if (staysError) {
    throw new Error(`Failed to load guest stays: ${staysError.message}`);
  }

  if (documentsError) {
    throw new Error(`Failed to load guest documents: ${documentsError.message}`);
  }

  const primaryCamp = getSingleRelation(guest.camps);

  return {
    guest: {
      id: guest.id,
      full_name: guest.full_name,
      primary_camp_id: guest.primary_camp_id,
      primary_camp_name: primaryCamp?.name ?? "Unknown camp",
      guest_category: guest.guest_category,
      gender: guest.gender,
      organization_name: guest.organization,
      department_or_project: guest.department_or_project,
      nationality: guest.nationality,
      phone: guest.phone,
      email: guest.email,
      id_or_passport_number: guest.id_or_passport_number,
      emergency_contact_name: guest.emergency_contact_name,
      emergency_contact_phone: guest.emergency_contact_phone,
      is_vip: guest.is_vip,
      security_clearance_status: guest.security_clearance_status,
      notes: guest.notes,
      manager_notes: guest.manager_notes,
      created_at: guest.created_at,
    },

    stays: (stays ?? []).map((stay) => {
      const room = getSingleRelation(stay.rooms);
      const roomCamp = getSingleRelation(room?.camps ?? null);

      return {
        id: stay.id,
        room_id: stay.room_id,
        room_number: room?.room_number ?? "Unknown room",
        camp_name: roomCamp?.name ?? "Unknown camp",
        status: stay.status,
        expected_arrival_at: stay.expected_arrival_at,
        expected_departure_at: stay.expected_departure_at,
        checked_in_at: stay.checked_in_at,
        checked_out_at: stay.checked_out_at,
      };
    }),

    documents: (documents ?? []).map((document) => ({
      id: document.id,
      document_type: document.document_type,
      status: document.status,
      uploaded_at: document.uploaded_at,
      original_filename: document.original_filename,
    })),
  };
}