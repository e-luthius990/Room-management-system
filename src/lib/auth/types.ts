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

/**
 * Must match public.camp_access_level enum.
 */
export const CAMP_ACCESS_LEVELS = [
  "viewer",
  "operator",
  "supervisor",
  "manager",
  "admin",
] as const satisfies readonly CampAccessLevel[];

/**
 * Must match public.roles.key where can_access_system = true.
 */
export const SYSTEM_ACCESS_ROLE_KEYS = [
  "super_admin",
  "system_admin",
  "camp_manager",
  "receptionist",
  "security",
  "executive_viewer",
] as const;

export type RoleKey = (typeof SYSTEM_ACCESS_ROLE_KEYS)[number];

/**
 * Global system-level roles.
 * These do not require user_camp_access.
 */
export const SYSTEM_ACTOR_ROLE_KEYS = [
  "super_admin",
  "system_admin",
] as const;

export type SystemActorRoleKey = (typeof SYSTEM_ACTOR_ROLE_KEYS)[number];

/**
 * Camp-scoped roles.
 * These require user_camp_access.
 */
export const CAMP_SCOPED_ROLE_KEYS = [
  "camp_manager",
  "receptionist",
  "security",
  "executive_viewer",
] as const;

export type CampScopedRoleKey = (typeof CAMP_SCOPED_ROLE_KEYS)[number];

/**
 * Backward-compatible alias.
 */
export const CAMP_INVITABLE_ROLE_KEYS = CAMP_SCOPED_ROLE_KEYS;

export type CampInvitableRoleKey = CampScopedRoleKey;

/**
 * Roles allowed from the invite UI.
 * super_admin is intentionally excluded.
 */
export const INVITABLE_ROLE_KEYS = [
  "system_admin",
  "camp_manager",
  "receptionist",
  "security",
  "executive_viewer",
] as const;

export type InvitableRoleKey = (typeof INVITABLE_ROLE_KEYS)[number];

/**
 * Super Admin can invite System Admin and camp-scoped users.
 */
export const SUPER_ADMIN_INVITABLE_ROLE_KEYS = INVITABLE_ROLE_KEYS;

export type SuperAdminInvitableRoleKey =
  (typeof SUPER_ADMIN_INVITABLE_ROLE_KEYS)[number];

/**
 * System Admin can invite camp-scoped users only.
 */
export const SYSTEM_ADMIN_INVITABLE_ROLE_KEYS = CAMP_SCOPED_ROLE_KEYS;

export type SystemAdminInvitableRoleKey =
  (typeof SYSTEM_ADMIN_INVITABLE_ROLE_KEYS)[number];

export const SYSTEM_ROLE_LABELS: Record<RoleKey, string> = {
  super_admin: "Super Admin",
  system_admin: "System Admin",
  camp_manager: "Camp Manager",
  receptionist: "Receptionist",
  security: "Security",
  executive_viewer: "Executive Viewer",
};

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  invited: "Invited",
  active: "Active",
  suspended: "Suspended",
  disabled: "Disabled",
  expired_invite: "Expired Invite",
  pending_password_reset: "Pending Password Reset",
};

export const CAMP_ACCESS_LEVEL_LABELS: Record<CampAccessLevel, string> = {
  viewer: "Viewer",
  operator: "Operator",
  supervisor: "Supervisor",
  manager: "Manager",
  admin: "Admin",
};

/**
 * Default DB access level for each camp-scoped role.
 * The server action must enforce this mapping.
 */
export const DEFAULT_ROLE_CAMP_ACCESS_LEVEL: Record<
  CampScopedRoleKey,
  CampAccessLevel
> = {
  camp_manager: "manager",
  receptionist: "operator",
  security: "operator",
  executive_viewer: "viewer",
};

/**
 * Backward-compatible alias.
 */
export const ROLE_DEFAULT_CAMP_ACCESS = DEFAULT_ROLE_CAMP_ACCESS_LEVEL;

export function isSystemAccessRoleKey(
  value: string | null | undefined,
): value is RoleKey {
  if (!value) {
    return false;
  }

  return SYSTEM_ACCESS_ROLE_KEYS.includes(value as RoleKey);
}

export function isSystemActorRoleKey(
  value: string | null | undefined,
): value is SystemActorRoleKey {
  if (!value) {
    return false;
  }

  return SYSTEM_ACTOR_ROLE_KEYS.includes(value as SystemActorRoleKey);
}

export function isCampScopedRoleKey(
  value: string | null | undefined,
): value is CampScopedRoleKey {
  if (!value) {
    return false;
  }

  return CAMP_SCOPED_ROLE_KEYS.includes(value as CampScopedRoleKey);
}

export function isInvitableRoleKey(
  value: string | null | undefined,
): value is InvitableRoleKey {
  if (!value) {
    return false;
  }

  return INVITABLE_ROLE_KEYS.includes(value as InvitableRoleKey);
}

export function isSuperAdminInvitableRoleKey(
  value: string | null | undefined,
): value is SuperAdminInvitableRoleKey {
  if (!value) {
    return false;
  }

  return SUPER_ADMIN_INVITABLE_ROLE_KEYS.includes(
    value as SuperAdminInvitableRoleKey,
  );
}

export function isSystemAdminInvitableRoleKey(
  value: string | null | undefined,
): value is SystemAdminInvitableRoleKey {
  if (!value) {
    return false;
  }

  return SYSTEM_ADMIN_INVITABLE_ROLE_KEYS.includes(
    value as SystemAdminInvitableRoleKey,
  );
}

export function roleRequiresCampAccess(roleKey: RoleKey): boolean {
  return isCampScopedRoleKey(roleKey);
}

export function roleIsSystemActor(roleKey: RoleKey): boolean {
  return isSystemActorRoleKey(roleKey);
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

export type AuthGuardFailureReason =
  | "unauthenticated"
  | "missing_profile"
  | "inactive_account"
  | "missing_role"
  | "role_not_allowed"
  | "missing_permission";

export type AuthGuardResult =
  | {
      ok: true;
      user: CurrentUserContext;
    }
  | {
      ok: false;
      reason: AuthGuardFailureReason;
    };