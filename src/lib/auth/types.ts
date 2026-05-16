import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

/**
 * DB-derived core entities
 */
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CampAccess =
  Database["public"]["Tables"]["user_camp_access"]["Row"];
export type Camp = Database["public"]["Tables"]["camps"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type Permission = Database["public"]["Tables"]["permissions"]["Row"];

export type AccountStatus = Database["public"]["Enums"]["account_status"];
export type CampAccessLevel =
  Database["public"]["Enums"]["camp_access_level"];

/**
 * -----------------------------
 * ROLE ARCHITECTURE (SOURCE OF TRUTH)
 * -----------------------------
 * Split system vs domain roles explicitly to avoid union collapse bugs.
 */

export const SYSTEM_ROLE_KEYS = ["super_admin", "system_admin"] as const;

export const CAMP_ROLE_KEYS = [
  "camp_manager",
  "receptionist",
  "security",
  "executive_viewer",
] as const;

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];
export type CampRoleKey = (typeof CAMP_ROLE_KEYS)[number];

export type RoleKey = SystemRoleKey | CampRoleKey;

/**
 * Role labels (fully type-safe, no drift possible)
 */
export const SYSTEM_ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: "Super Admin",
  system_admin: "System Admin",
  camp_manager: "Camp Manager",
  receptionist: "Receptionist",
  security: "Security",
  executive_viewer: "Executive Viewer",
} satisfies Record<RoleKey, string>;

/**
 * Safe runtime guard (no casting leaks, no union poisoning)
 */
export function isSystemAccessRoleKey(
  value: string | null | undefined,
): value is SystemRoleKey {
  if (typeof value !== "string") return false;

  return (SYSTEM_ROLE_KEYS as readonly string[]).includes(value);
}

/**
 * Convenience sets (intent-based, not filtered-derived)
 */
export const CAMP_INVITABLE_ROLE_KEYS: readonly CampRoleKey[] =
  CAMP_ROLE_KEYS;

/**
 * Current session role shape
 */
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