import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CampAccess =
  Database["public"]["Tables"]["user_camp_access"]["Row"];
export type Camp = Database["public"]["Tables"]["camps"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type Permission = Database["public"]["Tables"]["permissions"]["Row"];

export type AccountStatus = Database["public"]["Enums"]["account_status"];

export type CampAccessLevel =
  Database["public"]["Enums"]["camp_access_level"];

export const SYSTEM_ACCESS_ROLE_KEYS = [
  "super_admin",
  "system_admin",
  "camp_manager",
  "receptionist",
  "security",
  "executive_viewer",
] as const;

export type RoleKey = (typeof SYSTEM_ACCESS_ROLE_KEYS)[number];

export const SYSTEM_ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: "Super Admin",
  system_admin: "System Admin",
  camp_manager: "Camp Manager",
  receptionist: "Receptionist",
  security: "Security",
  executive_viewer: "Executive Viewer",
};

export function isSystemAccessRoleKey(
  value: string | null | undefined,
): value is RoleKey {
  if (!value) {
    return false;
  }

  return SYSTEM_ACCESS_ROLE_KEYS.includes(value as RoleKey);
}

export type CurrentRole = {
  id: string;
  key: RoleKey;
  name: string;
  canAccessSystem: boolean;
};

export type CurrentCampAccess = {
  id: string;
  camp_id: string;
  access_level: CampAccessLevel;
  camp_name: string;
  camp_code: string;
};

export type CurrentUserContext = {
  authUser: User;
  profile: Profile;
  role: CurrentRole;
  permissions: string[];
  campAccess: CurrentCampAccess[];
  isSystemActor: boolean;
};

export type AuthGuardResult =
  | {
      ok: true;
      user: CurrentUserContext;
    }
  | {
      ok: false;
      reason:
        | "unauthenticated"
        | "missing_profile"
        | "inactive_account"
        | "missing_role"
        | "role_not_allowed"
        | "missing_permission";
    };