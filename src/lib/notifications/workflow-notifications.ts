import "server-only";

import type { RoleKey } from "@/lib/auth/types";
import type { Database } from "@/lib/db/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type NotificationSeverity = "info" | "success" | "warning" | "urgent";

type WorkflowNotificationInput = {
  campId: string | null;
  title: string;
  body: string;
  category: string;
  severity?: NotificationSeverity;
  actionHref?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  excludeUserIds?: readonly string[];
};

type NotifyPermissionInput = WorkflowNotificationInput & {
  permission: string;
};

type NotifyRolesInput = WorkflowNotificationInput & {
  roleKeys: readonly RoleKey[];
};

type NotifyUsersInput = WorkflowNotificationInput & {
  recipientIds: readonly string[];
};

type RoleRow = {
  id: string;
  key: string;
};

type PermissionRow = {
  id: string;
};

type RolePermissionRow = {
  role_id: string;
};

type UserRoleRow = {
  user_id: string;
  role_id: string;
};

type CampAccessRow = {
  user_id: string;
};

type ProfileRow = {
  id: string;
};

type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

const SYSTEM_ROLE_KEYS = new Set<string>(["super_admin", "system_admin"]);

function normalizeId(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function uniqueIds(values: Iterable<string | null | undefined>): string[] {
  return [...new Set([...values].map(normalizeId).filter(Boolean) as string[])];
}

function normalizeActionHref(value: string | null | undefined): string | null {
  const normalized = normalizeId(value);

  if (!normalized || !normalized.startsWith("/")) {
    return null;
  }

  return normalized;
}

async function getActiveUserIds(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) {
    return new Set();
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .in("id", userIds)
    .eq("account_status", "active")
    .returns<ProfileRow[]>();

  if (error) {
    console.error("Failed to resolve notification recipients:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.id));
}

async function filterCampRecipients({
  userRoleRows,
  rolesById,
  campId,
}: {
  userRoleRows: UserRoleRow[];
  rolesById: Map<string, RoleRow>;
  campId: string | null;
}): Promise<string[]> {
  const systemUserIds = userRoleRows
    .filter((row) => SYSTEM_ROLE_KEYS.has(rolesById.get(row.role_id)?.key ?? ""))
    .map((row) => row.user_id);

  const scopedUserIds = userRoleRows
    .filter((row) => !SYSTEM_ROLE_KEYS.has(rolesById.get(row.role_id)?.key ?? ""))
    .map((row) => row.user_id);

  if (!campId || scopedUserIds.length === 0) {
    return uniqueIds(systemUserIds);
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_camp_access")
    .select("user_id")
    .in("user_id", uniqueIds(scopedUserIds))
    .eq("camp_id", campId)
    .is("revoked_at", null)
    .returns<CampAccessRow[]>();

  if (error) {
    console.error("Failed to filter notification recipients by camp:", error.message);
    return uniqueIds(systemUserIds);
  }

  return uniqueIds([...systemUserIds, ...(data ?? []).map((row) => row.user_id)]);
}

async function getRoleRowsByKeys(roleKeys: readonly string[]): Promise<RoleRow[]> {
  const keys = uniqueIds(roleKeys);

  if (keys.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id,key")
    .in("key", keys)
    .eq("can_access_system", true)
    .returns<RoleRow[]>();

  if (error) {
    console.error("Failed to load notification recipient roles:", error.message);
    return [];
  }

  return data ?? [];
}

async function getUserRolesForRoleIds(roleIds: string[]): Promise<UserRoleRow[]> {
  if (roleIds.length === 0) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id,role_id")
    .in("role_id", roleIds)
    .is("revoked_at", null)
    .returns<UserRoleRow[]>();

  if (error) {
    console.error("Failed to load notification recipient users:", error.message);
    return [];
  }

  return data ?? [];
}

async function getRecipientIdsForPermission({
  permission,
  campId,
}: {
  permission: string;
  campId: string | null;
}): Promise<string[]> {
  const normalizedPermission = normalizeId(permission);

  if (!normalizedPermission) {
    return [];
  }

  const supabase = createSupabaseAdminClient();
  const { data: permissions, error: permissionError } = await supabase
    .from("permissions")
    .select("id")
    .eq("key", normalizedPermission)
    .returns<PermissionRow[]>();

  if (permissionError) {
    console.error("Failed to load notification permission:", permissionError.message);
    return [];
  }

  const permissionId = permissions?.[0]?.id;

  if (!permissionId) {
    return [];
  }

  const { data: rolePermissions, error: rolePermissionError } = await supabase
    .from("role_permissions")
    .select("role_id")
    .eq("permission_id", permissionId)
    .returns<RolePermissionRow[]>();

  if (rolePermissionError) {
    console.error(
      "Failed to load notification permission roles:",
      rolePermissionError.message,
    );
    return [];
  }

  const roleIds = uniqueIds((rolePermissions ?? []).map((row) => row.role_id));

  if (roleIds.length === 0) {
    return [];
  }

  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id,key")
    .in("id", roleIds)
    .returns<RoleRow[]>();

  if (rolesError) {
    console.error("Failed to load notification roles:", rolesError.message);
    return [];
  }

  const userRoles = await getUserRolesForRoleIds(roleIds);
  const rolesById = new Map((roles ?? []).map((role) => [role.id, role]));

  return filterCampRecipients({
    userRoleRows: userRoles,
    rolesById,
    campId,
  });
}

async function getRecipientIdsForRoles({
  roleKeys,
  campId,
}: {
  roleKeys: readonly RoleKey[];
  campId: string | null;
}): Promise<string[]> {
  const roles = await getRoleRowsByKeys(roleKeys);
  const roleIds = roles.map((role) => role.id);
  const userRoles = await getUserRolesForRoleIds(roleIds);
  const rolesById = new Map(roles.map((role) => [role.id, role]));

  return filterCampRecipients({
    userRoleRows: userRoles,
    rolesById,
    campId,
  });
}

export async function notifyWorkflowUsers({
  recipientIds,
  campId,
  title,
  body,
  category,
  severity = "info",
  actionHref,
  entityType,
  entityId,
  excludeUserIds = [],
}: NotifyUsersInput): Promise<void> {
  const excludedIds = new Set(uniqueIds(excludeUserIds));
  const activeUserIds = await getActiveUserIds(uniqueIds(recipientIds));
  const recipients = [...activeUserIds].filter((userId) => !excludedIds.has(userId));

  if (recipients.length === 0) {
    return;
  }

  const normalizedCampId = normalizeId(campId);
  const normalizedActionHref = normalizeActionHref(actionHref);
  const notificationRows: NotificationInsert[] = recipients.map((recipientId) => ({
    user_id: recipientId,
    recipient_id: recipientId,
    camp_id: normalizedCampId,
    title,
    message: body,
    body,
    type: category,
    category,
    severity,
    status: "unread",
    entity_type: normalizeId(entityType),
    entity_id: normalizeId(entityId),
    action_href: normalizedActionHref,
  }));

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("notifications").insert(notificationRows);

  if (error) {
    console.error("Failed to create workflow notifications:", error.message);
  }
}

export async function notifyWorkflowPermission({
  permission,
  ...input
}: NotifyPermissionInput): Promise<void> {
  const recipientIds = await getRecipientIdsForPermission({
    permission,
    campId: normalizeId(input.campId),
  });

  await notifyWorkflowUsers({
    ...input,
    recipientIds,
  });
}

export async function notifyWorkflowRoles({
  roleKeys,
  ...input
}: NotifyRolesInput): Promise<void> {
  const recipientIds = await getRecipientIdsForRoles({
    roleKeys,
    campId: normalizeId(input.campId),
  });

  await notifyWorkflowUsers({
    ...input,
    recipientIds,
  });
}
