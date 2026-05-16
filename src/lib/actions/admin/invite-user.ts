"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/require-permission";
import { hasCampAccess } from "@/lib/auth/permissions";
import type {
  CampAccessLevel,
  CurrentUserContext,
  RoleKey,
} from "@/lib/auth/types";
import {
  inviteUserSchema,
  superAdminInviteUserSchema,
  INVITABLE_ROLE_KEYS,
  SUPER_ADMIN_INVITABLE_ROLE_KEYS,
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

const SYSTEM_ADMIN_INVITABLE_ROLE_KEYS = INVITABLE_ROLE_KEYS.filter(
  (roleKey) => roleKey !== "system_admin",
);

type RoleIdRow = {
  id: string;
};

type CampCheckRow = {
  id: string;
};

type ProfileCheckRow = {
  id: string;
};

type InviteCreatedUser = {
  id: string;
};

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
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
): roleKey is RoleKey {
  if (currentUser.role.key === "super_admin") {
    return (SUPER_ADMIN_INVITABLE_ROLE_KEYS as readonly string[]).includes(
      roleKey,
    );
  }

  if (currentUser.role.key === "system_admin") {
    return (SYSTEM_ADMIN_INVITABLE_ROLE_KEYS as readonly string[]).includes(
      roleKey,
    );
  }

  return false;
}

function requiredCampLevelForRole(roleKey: RoleKey): CampAccessLevel | null {
  switch (roleKey) {
    case "super_admin":
    case "system_admin":
      return null;

    case "camp_manager":
    case "executive_viewer":
      return "manager";

    case "receptionist":
    case "security":
      return "operator";

    default:
      return "viewer";
  }
}

function normalizeAccessLevel(
  roleKey: RoleKey,
  submittedLevel: CampAccessLevel | null | undefined,
): CampAccessLevel | null {
  const minimumLevel = requiredCampLevelForRole(roleKey);

  if (!minimumLevel) {
    return null;
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
    normalized.includes("email")
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
    normalized.includes("not authorized")
  ) {
    return "access_denied";
  }

  return "invite_failed";
}

async function getRoleId(roleKey: RoleKey): Promise<string> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("roles")
    .select("id")
    .eq("key", roleKey)
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

  await admin.auth.admin.deleteUser(userId);
}

async function disablePartiallyCreatedUser(
  userId: string,
  actorId: string,
): Promise<void> {
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
    redirectWithError("invalid_input");
  }

  if (!canAssignRole(currentUser, parsed.data.roleKey)) {
    redirectWithError("role_not_allowed");
  }

  const roleKey = parsed.data.roleKey;
  const roleId = await getRoleId(roleKey);
  const accessLevel = normalizeAccessLevel(roleKey, parsed.data.accessLevel);

  if (accessLevel && !parsed.data.campId) {
    redirectWithError("camp_required");
  }

  if (parsed.data.campId) {
    await ensureCampExists(parsed.data.campId);

    if (
      !isSystemActor(currentUser) &&
      !hasCampAccess(currentUser, parsed.data.campId, "admin")
    ) {
      redirectWithError("camp_not_allowed");
    }
  }

  const existingProfileId = await findExistingProfileByEmail(parsed.data.email);

  if (existingProfileId) {
    redirectWithError("user_exists");
  }

  const admin = createSupabaseAdminClient();
  const redirectTo = `${getAppUrl()}/auth/accept-invite`;

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo,
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        department: parsed.data.department,
        job_title: parsed.data.jobTitle,
        role_key: roleKey,
        camp_id: parsed.data.campId,
        access_level: accessLevel,
      },
    });

  if (inviteError || !inviteData.user) {
    redirectWithError(mapInviteError(inviteError?.message ?? "invite_failed"));
  }

  const invitedUser = inviteData.user as InviteCreatedUser;

  const { error: profileError } = await admin.from("profiles").insert({
    id: invitedUser.id,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    department: parsed.data.department,
    job_title: parsed.data.jobTitle,
    account_status: "invited",
    force_password_change: true,
    invited_by: currentUser.authUser.id,
    invited_at: new Date().toISOString(),
  });

  if (profileError) {
    await cleanupAuthOnlyUser(invitedUser.id);
    redirectWithError(mapInviteError(profileError.message));
  }

  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: invitedUser.id,
    role_id: roleId,
    assigned_by: currentUser.authUser.id,
  });

  if (roleError) {
    await disablePartiallyCreatedUser(invitedUser.id, currentUser.authUser.id);
    redirectWithError(mapInviteError(roleError.message));
  }

  if (parsed.data.campId && accessLevel) {
    const { error: campAccessError } = await admin
      .from("user_camp_access")
      .insert({
        user_id: invitedUser.id,
        camp_id: parsed.data.campId,
        access_level: accessLevel,
        granted_by: currentUser.authUser.id,
      });

    if (campAccessError) {
      await disablePartiallyCreatedUser(invitedUser.id, currentUser.authUser.id);
      redirectWithError(mapInviteError(campAccessError.message));
    }
  }

  revalidatePath(USERS_ROUTE);
  revalidatePath(INVITE_USER_ROUTE);
  revalidatePath("/admin");
  revalidatePath("/admin/users");

  redirect(`${USERS_ROUTE}?success=user_invited`);
}