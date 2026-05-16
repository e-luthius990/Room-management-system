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
import { isSystemAccessRoleKey } from "@/lib/auth/types";
import { SYSTEM_ROLES } from "@/lib/auth/permissions";

type AdminClient = SupabaseClient<Database>;

type RoleRow = {
  id: string;
  key: string;
  name: string;
  can_access_system: boolean | null;
};

type PermissionJoinRow = {
  permissions: {
    key: string;
  } | null;
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

async function loadActiveRole(
  admin: AdminClient,
  userId: string,
): Promise<CurrentRole | null> {
  const { data: userRole, error: userRoleError } = await admin
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (userRoleError) {
    throw new Error(`Failed to load user role: ${userRoleError.message}`);
  }

  if (!userRole?.role_id) {
    return null;
  }

  const { data: role, error: roleError } = await admin
    .from("roles")
    .select("id,key,name,can_access_system")
    .eq("id", userRole.role_id)
    .maybeSingle();

  if (roleError) {
    throw new Error(`Failed to load role: ${roleError.message}`);
  }

  if (!role) {
    return null;
  }

  const roleRow = role as RoleRow;

  if (!roleRow.can_access_system) {
    return null;
  }

  if (!isSystemAccessRoleKey(roleRow.key)) {
    return null;
  }

  return {
    id: roleRow.id,
    key: roleRow.key as RoleKey,
    name: roleRow.name,
    canAccessSystem: true,
  };
}

async function loadPermissions(
  admin: AdminClient,
  roleId: string,
): Promise<string[]> {
  const { data, error } = await admin
    .from("role_permissions")
    .select("permissions!inner(key)")
    .eq("role_id", roleId);

  if (error) {
    throw new Error(`Failed to load permissions: ${error.message}`);
  }

  const permissions = ((data ?? []) as PermissionJoinRow[])
    .map((row) => row.permissions?.key)
    .filter((key): key is string => Boolean(key));

  return Array.from(new Set(permissions)).sort();
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

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Failed to load profile: ${profileError.message}`);
    }

    if (!profile) {
      return null;
    }

    const role = await loadActiveRole(admin, user.id);

    if (!role || !role.canAccessSystem) {
      return null;
    }

    const [permissions, campAccess] = await Promise.all([
      loadPermissions(admin, role.id),
      loadCampAccess(admin, user.id),
    ]);

    return {
      authUser: user,
      profile,
      role,
      permissions,
      campAccess,
      isSystemActor: SYSTEM_ROLES.has(role.key),
    };
  },
);