import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type NotificationRecipientOption = {
  id: string;
  full_name: string;
  email: string | null;
  role_name: string | null;
};

export type NotificationCampOption = {
  id: string;
  name: string;
  code: string;
};

type ProfileRecipientRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type UserRoleRow = {
  user_id: string;
  role_id: string;
};

type RoleRow = {
  id: string;
  name: string | null;
  key: string | null;
};

type CampOptionRow = {
  id: string;
  name: string | null;
  code: string | null;
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

export async function getNotificationRecipientOptions(): Promise<
  NotificationRecipientOption[]
> {
  const supabase = await createServerSupabaseClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id,full_name,email")
    .eq("account_status", "active")
    .order("full_name", { ascending: true })
    .returns<ProfileRecipientRow[]>();

  if (error) {
    throw new Error(`Failed to load notification recipients: ${error.message}`);
  }

  const rows = profiles ?? [];

  if (rows.length === 0) {
    return [];
  }

  const userIds = rows.map((profile) => profile.id);

  const { data: userRoles, error: userRolesError } = await supabase
    .from("user_roles")
    .select("user_id,role_id")
    .in("user_id", userIds)
    .is("revoked_at", null)
    .returns<UserRoleRow[]>();

  if (userRolesError) {
    throw new Error(
      `Failed to load notification recipient roles: ${userRolesError.message}`,
    );
  }

  const roleIds = uniqueStrings((userRoles ?? []).map((row) => row.role_id));
  const rolesById = new Map<string, string>();

  if (roleIds.length > 0) {
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id,name,key")
      .in("id", roleIds)
      .returns<RoleRow[]>();

    if (rolesError) {
      throw new Error(
        `Failed to load notification role names: ${rolesError.message}`,
      );
    }

    for (const role of roles ?? []) {
      rolesById.set(role.id, toRequiredText(role.name, role.key ?? "Role"));
    }
  }

  const roleNameByUserId = new Map<string, string>();

  for (const userRole of userRoles ?? []) {
    const roleName = rolesById.get(userRole.role_id);

    if (roleName && !roleNameByUserId.has(userRole.user_id)) {
      roleNameByUserId.set(userRole.user_id, roleName);
    }
  }

  return rows.map((profile) => ({
    id: profile.id,
    full_name: toRequiredText(profile.full_name, "Unknown user"),
    email: profile.email,
    role_name: roleNameByUserId.get(profile.id) ?? null,
  }));
}

export async function getNotificationCampOptions(): Promise<
  NotificationCampOption[]
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
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