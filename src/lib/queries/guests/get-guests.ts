import "server-only";

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

export type GuestDirectoryItem = {
  id: string;
  full_name: string;
  primary_camp_id: string;
  primary_camp_name: string;
  guest_category: GuestCategory;
  organization_name: string | null;
  department_or_project: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  security_clearance_status: string | null;
  profile_photo_path: string | null;
  profile_photo_updated_at: string | null;
  created_at: string;
};

type GuestDirectoryRow = {
  id: string;
  full_name: string;
  primary_camp_id: string;
  guest_category: GuestCategory;
  organization: string | null;
  department_or_project: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  security_clearance_status: string | null;
  profile_photo_path: string | null;
  profile_photo_updated_at: string | null;
  created_at: string;
  camps: { name: string | null } | null;
};

function normalizeSearch(value?: string): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > 0 ? normalized.slice(0, 80) : null;
}

function escapePostgrestLikePattern(value: string): string {
  return value.replace(/[%_]/g, "\\$&");
}

export async function getGuests(
  search?: string,
): Promise<GuestDirectoryItem[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("guests")
    .select(
      [
        "id",
        "full_name",
        "primary_camp_id",
        "guest_category",
        "organization",
        "department_or_project",
        "nationality",
        "phone",
        "email",
        "security_clearance_status",
        "profile_photo_path",
        "profile_photo_updated_at",
        "created_at",
        "camps!guests_primary_camp_id_fkey(name)",
      ].join(","),
    )
    .is("archived_at", null);

  const cleanSearch = normalizeSearch(search);

  if (cleanSearch) {
    const pattern = escapePostgrestLikePattern(cleanSearch);

    query = query.or(
      [
        `full_name.ilike.%${pattern}%`,
        `organization.ilike.%${pattern}%`,
        `department_or_project.ilike.%${pattern}%`,
        `phone.ilike.%${pattern}%`,
        `email.ilike.%${pattern}%`,
        `nationality.ilike.%${pattern}%`,
      ].join(","),
    );
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<GuestDirectoryRow[]>();

  if (error) {
    throw new Error(`Failed to load guests: ${error.message}`);
  }

  return (data ?? []).map((guest) => ({
    id: guest.id,
    full_name: guest.full_name,
    primary_camp_id: guest.primary_camp_id,
    primary_camp_name: guest.camps?.name ?? "Unknown camp",
    guest_category: guest.guest_category,
    organization_name: guest.organization,
    department_or_project: guest.department_or_project,
    nationality: guest.nationality,
    phone: guest.phone,
    email: guest.email,
    security_clearance_status: guest.security_clearance_status,
    profile_photo_path: guest.profile_photo_path,
    profile_photo_updated_at: guest.profile_photo_updated_at,
    created_at: guest.created_at,
  }));
}
