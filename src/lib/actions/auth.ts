"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  forgotPasswordSchema,
  loginSchema,
  passwordUpdateSchema,
} from "@/lib/validation/auth";
import { getDefaultRouteForRole } from "@/lib/auth/redirect-by-role";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";
import type { RoleKey } from "@/lib/auth/types";

type UserAccessState = {
  roleKey: RoleKey | null;
  canAccessSystem: boolean;
  canAccessApp: boolean;
};

type ProfileStatusRow = {
  id: string;
  account_status: string | null;
  force_password_change: boolean | null;
};

type RoleJoinRow = {
  key?: string | null;
  can_access_system?: boolean | null;
};

const BLOCKED_NEXT_PREFIXES = ["/auth/", "/api/", "/_next/"] as const;

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

function getSafeNextPath(
  value: FormDataEntryValue | string | null,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const nextPath = value.trim();

  if (!nextPath) {
    return null;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  if (nextPath.includes("\\")) {
    return null;
  }

  if (BLOCKED_NEXT_PREFIXES.some((prefix) => nextPath.startsWith(prefix))) {
    return null;
  }

  return nextPath;
}

function buildRedirectPath(
  path: string,
  params: Record<string, string | null | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();

  return query ? `${path}?${query}` : path;
}

function redirectWithError(
  path: string,
  error: string,
  nextPath?: string | null,
): never {
  redirect(
    buildRedirectPath(path, {
      error,
      next: nextPath,
    }),
  );
}

function redirectWithSuccess(path: string, success: string): never {
  redirect(
    buildRedirectPath(path, {
      success,
    }),
  );
}

function isSystemRole(roleKey: RoleKey | null): boolean {
  return roleKey === "super_admin" || roleKey === "system_admin";
}

function normalizeRoleJoin(value: unknown): RoleJoinRow | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const first = value[0];

    return first && typeof first === "object" ? (first as RoleJoinRow) : null;
  }

  return typeof value === "object" ? (value as RoleJoinRow) : null;
}

async function getUserAccessState(userId: string): Promise<UserAccessState> {
  const admin = createSupabaseAdminClient();

  const [roleResult, campAccessResult] = await Promise.all([
    admin
      .from("user_roles")
      .select("roles!inner(key,can_access_system)")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("assigned_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    admin
      .from("user_camp_access")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("revoked_at", null),
  ]);

  if (roleResult.error) {
    throw new Error(`Failed to load user role: ${roleResult.error.message}`);
  }

  if (campAccessResult.error) {
    throw new Error(
      `Failed to check camp access: ${campAccessResult.error.message}`,
    );
  }

  const roleRow = roleResult.data as { roles?: unknown } | null;
  const role = normalizeRoleJoin(roleRow?.roles ?? null);

  const roleKey = (role?.key ?? null) as RoleKey | null;
  const canAccessSystem = role?.can_access_system === true;

  if (!roleKey || !canAccessSystem) {
    return {
      roleKey,
      canAccessSystem,
      canAccessApp: false,
    };
  }

  const hasCampAccess = (campAccessResult.count ?? 0) > 0;

  return {
    roleKey,
    canAccessSystem,
    canAccessApp: isSystemRole(roleKey) || hasCampAccess,
  };
}

async function loadProfileStatus(
  userId: string,
): Promise<ProfileStatusRow | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select("id,account_status,force_password_change")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return data;
}

async function markLoginSuccessful(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      last_login_at: new Date().toISOString(),
      failed_login_count: 0,
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update login metadata:", error.message);
  }
}

async function activateProfileAfterPasswordSet(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      account_status: "active",
      force_password_change: false,
      invite_accepted_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .in("account_status", ["invited", "pending_password_reset"]);

  if (error) {
    throw new Error(`Failed to activate profile: ${error.message}`);
  }
}

async function clearForcePasswordChange(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({
      force_password_change: false,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to clear password reset flag: ${error.message}`);
  }
}

async function writeAuthAuditLog({
  userId,
  action,
  reason,
}: {
  userId: string;
  action: string;
  reason: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();

  const { error } = await admin.from("audit_logs").insert({
    actor_user_id: userId,
    action,
    entity_type: "profiles",
    entity_id: userId,
    new_value: {
      account_status: "active",
      force_password_change: false,
    },
    reason,
  });

  if (error) {
    console.error(`Failed to write ${action} audit log:`, error.message);
  }
}

function getPostAuthRedirectPath({
  nextPath,
  roleKey,
}: {
  nextPath: string | null;
  roleKey: RoleKey | null;
}): string {
  if (nextPath) {
    return nextPath;
  }

  if (roleKey) {
    return getDefaultRouteForRole(roleKey);
  }

  return SYSTEM_ROUTES.dashboard;
}

function redirectAfterAuth({
  nextPath,
  roleKey,
}: {
  nextPath: string | null;
  roleKey: RoleKey | null;
}): never {
  redirect(
    getPostAuthRedirectPath({
      nextPath,
      roleKey,
    }),
  );
}

export async function signInAction(formData: FormData): Promise<never> {
  const rawNextPath = getSafeNextPath(formData.get("next"));

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    redirectWithError(AUTH_ROUTES.login, "invalid_input", rawNextPath);
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user || !data.session) {
    redirectWithError(AUTH_ROUTES.login, "invalid_credentials", rawNextPath);
  }

  redirect(
    buildRedirectPath(AUTH_ROUTES.callback, {
      next: parsed.data.next ?? SYSTEM_ROUTES.dashboard,
    }),
  );
}

export async function requestPasswordResetAction(
  formData: FormData,
): Promise<never> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirectWithError(AUTH_ROUTES.forgotPassword, "invalid_input");
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${getAppUrl()}${AUTH_ROUTES.callback}?next=${encodeURIComponent(
        AUTH_ROUTES.resetPassword,
      )}`,
    },
  );

  if (error) {
    redirectWithError(AUTH_ROUTES.forgotPassword, "reset_request_failed");
  }

  redirectWithSuccess(AUTH_ROUTES.forgotPassword, "reset_link_sent");
}

export async function resetPasswordAction(formData: FormData): Promise<never> {
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirectWithError(AUTH_ROUTES.resetPassword, "invalid_input");
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirectWithError(AUTH_ROUTES.resetPassword, "session_required");
  }

  const [profile, accessState] = await Promise.all([
    loadProfileStatus(user.id),
    getUserAccessState(user.id),
  ]);

  if (!profile) {
    await supabase.auth.signOut();
    redirectWithError(SYSTEM_ROUTES.accessPending, "profile_missing");
  }

  if (profile.account_status === "disabled") {
    await supabase.auth.signOut();
    redirectWithError(AUTH_ROUTES.login, "account_disabled");
  }

  if (profile.account_status === "suspended") {
    await supabase.auth.signOut();
    redirectWithError(AUTH_ROUTES.login, "account_suspended");
  }

  if (profile.account_status === "expired_invite") {
    await supabase.auth.signOut();
    redirectWithError(AUTH_ROUTES.login, "invite_expired");
  }

  if (!accessState.canAccessApp || !accessState.roleKey) {
    await supabase.auth.signOut();
    redirectWithError(SYSTEM_ROUTES.accessPending, "access_not_assigned");
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    redirectWithError(AUTH_ROUTES.resetPassword, "password_update_failed");
  }

  try {
    if (
      profile.account_status === "invited" ||
      profile.account_status === "pending_password_reset"
    ) {
      await activateProfileAfterPasswordSet(user.id);
    } else {
      await clearForcePasswordChange(user.id);
    }
  } catch (activationError) {
    console.error(
      activationError instanceof Error
        ? activationError.message
        : "Failed to finalize password update.",
    );

    redirectWithError(AUTH_ROUTES.resetPassword, "password_update_failed");
  }

  await markLoginSuccessful(user.id);

  await writeAuthAuditLog({
    userId: user.id,
    action: "auth.password_updated",
    reason: "User completed password update.",
  });

  redirectAfterAuth({
    nextPath: null,
    roleKey: accessState.roleKey,
  });
}

export async function acceptInviteAction(formData: FormData): Promise<never> {
  const parsed = passwordUpdateSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirectWithError(AUTH_ROUTES.acceptInvite, "invalid_input");
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirectWithError(AUTH_ROUTES.acceptInvite, "session_required");
  }

  const [profile, accessState] = await Promise.all([
    loadProfileStatus(user.id),
    getUserAccessState(user.id),
  ]);

  if (!profile) {
    await supabase.auth.signOut();
    redirectWithError(SYSTEM_ROUTES.accessPending, "profile_missing");
  }

  if (profile.account_status === "disabled") {
    await supabase.auth.signOut();
    redirectWithError(AUTH_ROUTES.login, "account_disabled");
  }

  if (profile.account_status === "suspended") {
    await supabase.auth.signOut();
    redirectWithError(AUTH_ROUTES.login, "account_suspended");
  }

  if (profile.account_status === "expired_invite") {
    await supabase.auth.signOut();
    redirectWithError(AUTH_ROUTES.login, "invite_expired");
  }

  if (!accessState.canAccessApp || !accessState.roleKey) {
    await supabase.auth.signOut();
    redirectWithError(SYSTEM_ROUTES.accessPending, "access_not_assigned");
  }

  if (profile.account_status === "active") {
    await markLoginSuccessful(user.id);

    redirectAfterAuth({
      nextPath: null,
      roleKey: accessState.roleKey,
    });
  }

  if (
    profile.account_status !== "invited" &&
    profile.account_status !== "pending_password_reset"
  ) {
    await supabase.auth.signOut();
    redirectWithError(SYSTEM_ROUTES.accessPending, "access_not_assigned");
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (passwordError) {
    redirectWithError(AUTH_ROUTES.acceptInvite, "password_update_failed");
  }

  try {
    await activateProfileAfterPasswordSet(user.id);
  } catch (activationError) {
    console.error(
      activationError instanceof Error
        ? activationError.message
        : "Failed to activate invited profile.",
    );

    redirectWithError(AUTH_ROUTES.acceptInvite, "password_update_failed");
  }

  await markLoginSuccessful(user.id);

  await writeAuthAuditLog({
    userId: user.id,
    action: "users.invite_accepted",
    reason: "User accepted invite and set password.",
  });

  redirectAfterAuth({
    nextPath: null,
    roleKey: accessState.roleKey,
  });
}

export async function signOutAction(): Promise<never> {
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirectWithSuccess(AUTH_ROUTES.login, "signed_out");
}