"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/require-permission";
import type {
  CampAccessLevel,
  CampScopedRoleKey,
  CurrentUserContext,
  InvitableRoleKey,
} from "@/lib/auth/types";
import {
  DEFAULT_ROLE_CAMP_ACCESS_LEVEL,
  INVITABLE_ROLE_KEYS,
  SYSTEM_ADMIN_INVITABLE_ROLE_KEYS,
  isCampScopedRoleKey,
} from "@/lib/auth/types";
import {
  inviteUserSchema,
  superAdminInviteUserSchema,
} from "@/lib/validation/admin-users";

const INVITE_USER_ROUTE = "/admin/users/invite";
const USERS_ROUTE = "/admin/users";

const ACCESS_LEVEL_RANK: Record<CampAccessLevel, number> = {
  viewer: 1,
  operator: 2,
  supervisor: 3,
  manager: 4,
  admin: 5,
};

type RoleIdRow = {
  id: string;
};

type CampCheckRow = {
  id: string;
};

type ProfileCheckRow = {
  id: string;
};

function getAppUrl(): string {
  const rawUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  const normalized = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

  return normalized.replace(/\/+$/, "");
}

function getInviteRedirectUrl(): string {
  return `${getAppUrl()}/auth/callback?next=/auth/accept-invite`;
}

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function redirectWithError(error: string): never {
  redirect(`${INVITE_USER_ROUTE}?error=${encodeURIComponent(error)}`);
}

function isSystemActor(user: CurrentUserContext): boolean {
  return user.role.key === "super_admin" || user.role.key === "system_admin";
}

function canAssignRole(
  currentUser: CurrentUserContext,
  roleKey: string,
): roleKey is InvitableRoleKey {
  if (currentUser.role.key === "super_admin") {
    return INVITABLE_ROLE_KEYS.includes(roleKey as InvitableRoleKey);
  }

  if (currentUser.role.key === "system_admin") {
    return SYSTEM_ADMIN_INVITABLE_ROLE_KEYS.includes(
      roleKey as CampScopedRoleKey,
    );
  }

  return false;
}

function getMinimumCampAccessLevel(roleKey: CampScopedRoleKey): CampAccessLevel {
  return DEFAULT_ROLE_CAMP_ACCESS_LEVEL[roleKey];
}

function resolveCampAccessLevel(params: {
  currentUser: CurrentUserContext;
  roleKey: InvitableRoleKey;
  submittedLevel: CampAccessLevel | null | undefined;
}): CampAccessLevel | null {
  const { currentUser, roleKey, submittedLevel } = params;

  if (!isCampScopedRoleKey(roleKey)) {
    return null;
  }

  const minimumLevel = getMinimumCampAccessLevel(roleKey);

  if (currentUser.role.key !== "super_admin") {
    return minimumLevel;
  }

  if (!submittedLevel) {
    return minimumLevel;
  }

  return ACCESS_LEVEL_RANK[submittedLevel] >= ACCESS_LEVEL_RANK[minimumLevel]
    ? submittedLevel
    : minimumLevel;
}

function mapInviteError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("already") ||
    normalized.includes("duplicate") ||
    normalized.includes("unique") ||
    normalized.includes("registered")
  ) {
    return "user_exists";
  }

  if (normalized.includes("role")) {
    return "role_not_found";
  }

  if (normalized.includes("camp")) {
    return "camp_not_found";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("access") ||
    normalized.includes("not authorized") ||
    normalized.includes("forbidden")
  ) {
    return "access_denied";
  }

  return "invite_failed";
}

async function getRoleId(roleKey: InvitableRoleKey): Promise<string> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("roles")
    .select("id")
    .eq("key", roleKey)
    .eq("can_access_system", true)
    .returns<RoleIdRow[]>()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load role: ${error.message}`);
  }

  if (!data) {
    redirectWithError("role_not_found");
  }

  return data.id;
}

async function ensureCampExists(campId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("camps")
    .select("id")
    .eq("id", campId)
    .eq("status", "active")
    .is("deleted_at", null)
    .returns<CampCheckRow[]>()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check camp: ${error.message}`);
  }

  if (!data) {
    redirectWithError("camp_not_found");
  }
}

async function findExistingProfileByEmail(email: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .returns<ProfileCheckRow[]>()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check existing profile: ${error.message}`);
  }

  return data?.id ?? null;
}

async function cleanupAuthOnlyUser(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // Best-effort cleanup only.
  }
}

async function disablePartiallyCreatedUser(params: {
  userId: string;
  actorId: string;
}): Promise<void> {
  const { userId, actorId } = params;

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  await admin
    .from("user_camp_access")
    .update({
      revoked_at: now,
      revoked_by: actorId,
    })
    .eq("user_id", userId)
    .is("revoked_at", null);

  await admin
    .from("user_roles")
    .update({
      revoked_at: now,
      revoked_by: actorId,
    })
    .eq("user_id", userId)
    .is("revoked_at", null);

  await admin
    .from("profiles")
    .update({
      account_status: "disabled",
      force_password_change: true,
      disabled_by: actorId,
      disabled_at: now,
      updated_at: now,
    })
    .eq("id", userId);
}

export async function inviteUserAction(formData: FormData): Promise<never> {
  const currentUser = await requirePermission("users.invite");

  if (!isSystemActor(currentUser)) {
    redirectWithError("forbidden");
  }

  const schema =
    currentUser.role.key === "super_admin"
      ? superAdminInviteUserSchema
      : inviteUserSchema;

  const parsed = schema.safeParse({
    fullName: getFormString(formData, "fullName"),
    email: getFormString(formData, "email"),
    phone: getFormString(formData, "phone"),
    department: getFormString(formData, "department"),
    jobTitle: getFormString(formData, "jobTitle"),
    roleKey: getFormString(formData, "roleKey"),
    campId: getFormString(formData, "campId"),
    accessLevel: getFormString(formData, "accessLevel"),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    redirectWithError(firstIssue?.message ?? "invalid_input");
  }

  const requestedRoleKey = parsed.data.roleKey;

  if (!canAssignRole(currentUser, requestedRoleKey)) {
    redirectWithError("role_not_allowed");
  }

  const roleKey: InvitableRoleKey = requestedRoleKey;
  const campScopedRole = isCampScopedRoleKey(roleKey);
  const campId = parsed.data.campId;

  const accessLevel = resolveCampAccessLevel({
    currentUser,
    roleKey,
    submittedLevel: parsed.data.accessLevel,
  });

  if (campScopedRole && !campId) {
    redirectWithError("camp_required");
  }

  if (!campScopedRole && campId) {
    redirectWithError("system_role_cannot_have_camp");
  }

  if (!campScopedRole && accessLevel) {
    redirectWithError("system_role_cannot_have_access_level");
  }

  if (campId) {
    await ensureCampExists(campId);
  }

  const existingProfileId = await findExistingProfileByEmail(parsed.data.email);

  if (existingProfileId) {
    redirectWithError("user_exists");
  }

  const roleId = await getRoleId(roleKey);
  const admin = createSupabaseAdminClient();

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo: getInviteRedirectUrl(),
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        department: parsed.data.department,
        job_title: parsed.data.jobTitle,
        role_key: roleKey,
        camp_id: campId,
        access_level: accessLevel,
      },
    });

  const invitedUserId = inviteData.user?.id;

  if (inviteError || !invitedUserId) {
    redirectWithError(mapInviteError(inviteError?.message ?? "invite_failed"));
  }

  const actorId = currentUser.profile.id;
  const invitedAt = new Date().toISOString();

  const { error: profileError } = await admin.from("profiles").insert({
    id: invitedUserId,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    department: parsed.data.department,
    job_title: parsed.data.jobTitle,
    account_status: "invited",
    force_password_change: true,
    invited_by: actorId,
    invited_at: invitedAt,
  });

  if (profileError) {
    await cleanupAuthOnlyUser(invitedUserId);
    redirectWithError(mapInviteError(profileError.message));
  }

  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: invitedUserId,
    role_id: roleId,
    assigned_by: actorId,
  });

  if (roleError) {
    await disablePartiallyCreatedUser({
      userId: invitedUserId,
      actorId,
    });

    redirectWithError(mapInviteError(roleError.message));
  }

  if (campId && accessLevel) {
    const { error: campAccessError } = await admin
      .from("user_camp_access")
      .insert({
        user_id: invitedUserId,
        camp_id: campId,
        access_level: accessLevel,
        granted_by: actorId,
      });

    if (campAccessError) {
      await disablePartiallyCreatedUser({
        userId: invitedUserId,
        actorId,
      });

      redirectWithError(mapInviteError(campAccessError.message));
    }
  }

  revalidatePath(USERS_ROUTE);
  revalidatePath(INVITE_USER_ROUTE);
  revalidatePath("/admin");

  redirect(`${USERS_ROUTE}?success=user_invited`);
}