import "server-only";

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/db/types";
import type {
  AccountStatus,
  CampAccessLevel,
  CurrentCampAccess,
  CurrentRole,
  CurrentUserContext,
  RoleKey,
} from "@/lib/auth/types";
import { SYSTEM_ROLES } from "@/lib/auth/permissions";

type AdminClient = SupabaseClient<Database>;

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type RolePermissionJoinRow = {
  permissions: {
    key: string;
  } | null;
};

type RoleWithPermissionsRow = {
  id: string;
  key: string;
  name: string;
  can_access_system: boolean | null;
  role_permissions: RolePermissionJoinRow[] | null;
};

type UserRoleWithRoleRow = {
  role_id: string | null;
  roles: RoleWithPermissionsRow | RoleWithPermissionsRow[] | null;
};

type CampAccessJoinRow = {
  id: string;
  camp_id: string;
  access_level: CampAccessLevel;
  camps: {
    name: string;
    code: string;
  } | null;
};

type ActiveRoleResult = {
  role: CurrentRole;
  permissions: string[];
};

const APP_ACCESS_ROLE_KEYS = new Set<string>([
  "super_admin",
  "system_admin",
  "camp_manager",
  "receptionist",
  "security",
  "executive_viewer",
]);

export function isActiveAccountStatus(status: AccountStatus | null): boolean {
  return status === "active";
}

export function isPendingAccountStatus(status: AccountStatus | null): boolean {
  return (
    status === "invited" ||
    status === "expired_invite" ||
    status === "pending_password_reset"
  );
}

export function isBlockedAccountStatus(status: AccountStatus | null): boolean {
  return status === "suspended" || status === "disabled";
}

function normalizeRoleRow(
  value: RoleWithPermissionsRow | RoleWithPermissionsRow[] | null,
): RoleWithPermissionsRow | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

function isAppAccessRoleKey(value: string | null | undefined): value is RoleKey {
  return typeof value === "string" && APP_ACCESS_ROLE_KEYS.has(value);
}

function normalizePermissions(
  rolePermissions: RolePermissionJoinRow[] | null,
): string[] {
  const permissions = (rolePermissions ?? [])
    .map((row) => row.permissions?.key)
    .filter((key): key is string => Boolean(key));

  return Array.from(new Set(permissions)).sort();
}

async function loadProfile(
  admin: AdminClient,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data;
}

async function loadActiveRoleWithPermissions(
  admin: AdminClient,
  userId: string,
): Promise<ActiveRoleResult | null> {
  const { data, error } = await admin
    .from("user_roles")
    .select(
      `
        role_id,
        roles!inner (
          id,
          key,
          name,
          can_access_system,
          role_permissions (
            permissions!inner (
              key
            )
          )
        )
      `,
    )
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load active role: ${error.message}`);
  }

  const userRole = data as UserRoleWithRoleRow | null;
  const roleRow = normalizeRoleRow(userRole?.roles ?? null);

  if (!roleRow?.id) {
    return null;
  }

  if (roleRow.can_access_system !== true) {
    return null;
  }

  if (!isAppAccessRoleKey(roleRow.key)) {
    return null;
  }

  return {
    role: {
      id: roleRow.id,
      key: roleRow.key,
      name: roleRow.name,
      canAccessSystem: true,
    },
    permissions: normalizePermissions(roleRow.role_permissions),
  };
}

async function loadCampAccess(
  admin: AdminClient,
  userId: string,
): Promise<CurrentCampAccess[]> {
  const { data, error } = await admin
    .from("user_camp_access")
    .select("id,camp_id,access_level,camps!inner(name,code)")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("granted_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load camp access: ${error.message}`);
  }

  return ((data ?? []) as CampAccessJoinRow[]).map((row) => ({
    id: row.id,
    camp_id: row.camp_id,
    access_level: row.access_level,
    camp_name: row.camps?.name ?? "Unknown camp",
    camp_code: row.camps?.code ?? "UNKNOWN",
  }));
}

export const getCurrentUser = cache(
  async (): Promise<CurrentUserContext | null> => {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const admin = createSupabaseAdminClient();

    const [profile, activeRole, campAccess] = await Promise.all([
      loadProfile(admin, user.id),
      loadActiveRoleWithPermissions(admin, user.id),
      loadCampAccess(admin, user.id),
    ]);

    if (!profile) {
      return null;
    }

    if (!activeRole?.role.canAccessSystem) {
      return null;
    }

    return {
      authUser: user,
      profile,
      role: activeRole.role,
      permissions: activeRole.permissions,
      campAccess,
      isSystemActor: SYSTEM_ROLES.has(activeRole.role.key),
    };
  },
);