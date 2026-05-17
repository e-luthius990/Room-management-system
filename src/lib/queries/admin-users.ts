import "server-only";

import type { Database } from "@/lib/db/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  INVITABLE_ROLE_KEYS,
  SYSTEM_ADMIN_INVITABLE_ROLE_KEYS,
  isInvitableRoleKey,
  isSystemAccessRoleKey,
  type InvitableRoleKey,
  type RoleKey,
} from "@/lib/auth/types";

type AccountStatus = Database["public"]["Enums"]["account_status"];

export type InviteRoleOption = {
  key: InvitableRoleKey;
  name: string;
};

export type CampOption = {
  id: string;
  name: string;
  code: string;
};

export type AdminUserListItem = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  account_status: AccountStatus;
  role_name: string | null;
  role_key: RoleKey | null;
  camp_count: number;
  created_at: string;
};

type RoleOptionRow = {
  key: string | null;
  name: string | null;
};

type CampOptionRow = {
  id: string;
  name: string | null;
  code: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  account_status: AccountStatus | null;
  created_at: string | null;
};

type UserRoleRow = {
  user_id: string;
  role_id: string;
};

type RoleLookupRow = {
  id: string;
  key: string | null;
  name: string | null;
};

type UserCampAccessRow = {
  user_id: string;
  camp_id: string;
};

function toRequiredText(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

function uniqueStrings(
  values: ReadonlyArray<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function getAllowedInviteRoleKeys(
  currentRoleKey: RoleKey,
): readonly InvitableRoleKey[] {
  if (currentRoleKey === "super_admin") {
    return INVITABLE_ROLE_KEYS;
  }

  if (currentRoleKey === "system_admin") {
    return SYSTEM_ADMIN_INVITABLE_ROLE_KEYS;
  }

  return [];
}

export async function getInviteRoleOptions(
  currentRoleKey: RoleKey,
): Promise<InviteRoleOption[]> {
  const allowedRoleKeys = getAllowedInviteRoleKeys(currentRoleKey);

  if (allowedRoleKeys.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("roles")
    .select("key,name")
    .in("key", [...allowedRoleKeys])
    .eq("can_access_system", true)
    .order("name", { ascending: true })
    .returns<RoleOptionRow[]>();

  if (error) {
    throw new Error(`Failed to load invite roles: ${error.message}`);
  }

  return (data ?? [])
    .filter((role): role is RoleOptionRow & { key: InvitableRoleKey } =>
      isInvitableRoleKey(role.key),
    )
    .map((role) => ({
      key: role.key,
      name: toRequiredText(role.name, role.key),
    }));
}

export async function getCampOptions(): Promise<CampOption[]> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("camps")
    .select("id,name,code")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name", { ascending: true })
    .returns<CampOptionRow[]>();

  if (error) {
    throw new Error(`Failed to load camps: ${error.message}`);
  }

  return (data ?? []).map((camp) => ({
    id: camp.id,
    name: toRequiredText(camp.name, "Unnamed camp"),
    code: toRequiredText(camp.code, "UNKNOWN"),
  }));
}

export async function getAdminUsers(): Promise<AdminUserListItem[]> {
  const admin = createSupabaseAdminClient();

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select(
      [
        "id",
        "full_name",
        "email",
        "phone",
        "department",
        "job_title",
        "account_status",
        "created_at",
      ].join(","),
    )
    .order("created_at", { ascending: false })
    .returns<ProfileRow[]>();

  if (profilesError) {
    throw new Error(`Failed to load users: ${profilesError.message}`);
  }

  const profileRows = profiles ?? [];
  const userIds = profileRows.map((profile) => profile.id);

  if (userIds.length === 0) {
    return [];
  }

  const [userRolesResult, campAccessResult] = await Promise.all([
    admin
      .from("user_roles")
      .select("user_id,role_id")
      .in("user_id", userIds)
      .is("revoked_at", null)
      .returns<UserRoleRow[]>(),

    admin
      .from("user_camp_access")
      .select("user_id,camp_id")
      .in("user_id", userIds)
      .is("revoked_at", null)
      .returns<UserCampAccessRow[]>(),
  ]);

  if (userRolesResult.error) {
    throw new Error(
      `Failed to load user roles: ${userRolesResult.error.message}`,
    );
  }

  if (campAccessResult.error) {
    throw new Error(
      `Failed to load user camp access: ${campAccessResult.error.message}`,
    );
  }

  const userRoleRows = userRolesResult.data ?? [];
  const campAccessRows = campAccessResult.data ?? [];

  const roleIds = uniqueStrings(userRoleRows.map((row) => row.role_id));
  const rolesById = new Map<string, { key: RoleKey; name: string }>();

  if (roleIds.length > 0) {
    const { data: roles, error: rolesError } = await admin
      .from("roles")
      .select("id,key,name")
      .in("id", roleIds)
      .eq("can_access_system", true)
      .returns<RoleLookupRow[]>();

    if (rolesError) {
      throw new Error(`Failed to load role details: ${rolesError.message}`);
    }

    for (const role of roles ?? []) {
      if (!isSystemAccessRoleKey(role.key)) {
        continue;
      }

      rolesById.set(role.id, {
        key: role.key,
        name: toRequiredText(role.name, role.key),
      });
    }
  }

  const roleByUserId = new Map<string, { key: RoleKey; name: string }>();

  for (const row of userRoleRows) {
    const role = rolesById.get(row.role_id);

    if (role && !roleByUserId.has(row.user_id)) {
      roleByUserId.set(row.user_id, role);
    }
  }

  const campIdsByUserId = new Map<string, Set<string>>();

  for (const row of campAccessRows) {
    const campIds = campIdsByUserId.get(row.user_id) ?? new Set<string>();

    campIds.add(row.camp_id);
    campIdsByUserId.set(row.user_id, campIds);
  }

  return profileRows.map((profile) => {
    const role = roleByUserId.get(profile.id);

    return {
      id: profile.id,
      full_name: toRequiredText(profile.full_name, "Unknown user"),
      email: profile.email,
      phone: profile.phone,
      department: profile.department,
      job_title: profile.job_title,
      account_status: profile.account_status ?? "invited",
      role_name: role?.name ?? null,
      role_key: role?.key ?? null,
      camp_count: campIdsByUserId.get(profile.id)?.size ?? 0,
      created_at: profile.created_at ?? new Date(0).toISOString(),
    };
  });
}