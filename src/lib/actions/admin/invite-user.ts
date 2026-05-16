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
} from "@/lib/validation/admin-users";

const INVITE_USER_ROUTE = "/admin/users/invite";
const USERS_ROUTE = "/admin/users";

/**
 * -----------------------------
 * ROLE DOMAIN MODEL (NO ARRAYS, NO CAST DRIFT)
 * -----------------------------
 */

const SYSTEM_ROLE_MAP = {
  super_admin: true,
  system_admin: true,
} as const;

type SystemRoleKey = keyof typeof SYSTEM_ROLE_MAP;

function isSystemActor(user: CurrentUserContext): boolean {
  return SYSTEM_ROLE_MAP[user.role.key as SystemRoleKey] === true;
}

/**
 * Role assignment rules (explicit RBAC)
 */
function canAssignRole(
  currentUser: CurrentUserContext,
  roleKey: RoleKey,
): boolean {
  const actorRole = currentUser.role.key;

  if (actorRole === "super_admin") return true;

  if (actorRole === "system_admin") {
    return roleKey !== "super_admin";
  }

  return false;
}

/**
 * Camp-level logic
 */
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
  const ACCESS_LEVEL_RANK: Record<CampAccessLevel, number> = {
    viewer: 1,
    operator: 2,
    supervisor: 3,
    manager: 4,
    admin: 5,
  };

  const minimumLevel = requiredCampLevelForRole(roleKey);

  if (!minimumLevel) return null;

  if (!submittedLevel) return minimumLevel;

  return ACCESS_LEVEL_RANK[submittedLevel] >= ACCESS_LEVEL_RANK[minimumLevel]
    ? submittedLevel
    : minimumLevel;
}

/**
 * Utilities
 */
function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function redirectWithError(error: string): never {
  redirect(`${INVITE_USER_ROUTE}?error=${encodeURIComponent(error)}`);
}

/**
 * DB helpers
 */
async function getRoleId(roleKey: RoleKey): Promise<string> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("roles")
    .select("id")
    .eq("key", roleKey)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) redirectWithError("role_not_found");

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
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) redirectWithError("camp_not_found");
}

async function findExistingProfileByEmail(email: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

/**
 * MAIN ACTION
 */
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

  const roleKey = parsed.data.roleKey as RoleKey;

  if (!canAssignRole(currentUser, roleKey)) {
    redirectWithError("role_not_allowed");
  }

  const roleId = await getRoleId(roleKey);
  const accessLevel = normalizeAccessLevel(roleKey, parsed.data.accessLevel);

  if (accessLevel && !parsed.data.campId) {
    redirectWithError("camp_required");
  }

  if (parsed.data.campId) {
    await ensureCampExists(parsed.data.campId);

    if (!isSystemActor(currentUser)) {
      const allowed = hasCampAccess(
        currentUser,
        parsed.data.campId,
        "admin",
      );

      if (!allowed) redirectWithError("camp_not_allowed");
    }
  }

  const existingProfileId = await findExistingProfileByEmail(parsed.data.email);
  if (existingProfileId) redirectWithError("user_exists");

  const admin = createSupabaseAdminClient();

  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo: `${getAppUrl()}/auth/accept-invite`,
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
    redirectWithError("invite_failed");
  }

  const userId = inviteData.user.id;

  const { error: profileError } = await admin.from("profiles").insert({
    id: userId,
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
    await admin.auth.admin.deleteUser(userId);
    redirectWithError("profile_create_failed");
  }

  const { error: roleError } = await admin.from("user_roles").insert({
    user_id: userId,
    role_id: roleId,
    assigned_by: currentUser.authUser.id,
  });

  if (roleError) {
    redirectWithError("role_assign_failed");
  }

  if (parsed.data.campId && accessLevel) {
    const { error: campAccessError } = await admin
      .from("user_camp_access")
      .insert({
        user_id: userId,
        camp_id: parsed.data.campId,
        access_level: accessLevel,
        granted_by: currentUser.authUser.id,
      });

    if (campAccessError) {
      redirectWithError("camp_access_failed");
    }
  }

  revalidatePath(USERS_ROUTE);
  revalidatePath(INVITE_USER_ROUTE);
  revalidatePath("/admin");

  redirect(`${USERS_ROUTE}?success=user_invited`);
}