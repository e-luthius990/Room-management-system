"use server";

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

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

function getSafeNextPath(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  if (value.startsWith("/auth/")) {
    return null;
  }

  return value;
}

function redirectWithError(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

function redirectWithSuccess(path: string, success: string): never {
  redirect(`${path}?success=${encodeURIComponent(success)}`);
}

async function getUserRoleKey(userId: string): Promise<RoleKey | null> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("user_roles")
    .select("roles!inner(key)")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user role: ${error.message}`);
  }

  const role = data?.roles as { key?: RoleKey } | null;

  return role?.key ?? null;
}

async function hasActiveCampAccess(userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();

  const { count, error } = await admin
    .from("user_camp_access")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    throw new Error(`Failed to check camp access: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

async function userCanAccessApp(userId: string): Promise<boolean> {
  const roleKey = await getUserRoleKey(userId);

  if (!roleKey) {
    return false;
  }

  if (roleKey === "super_admin" || roleKey === "system_admin") {
    return true;
  }

  return hasActiveCampAccess(userId);
}

export async function signInAction(formData: FormData): Promise<never> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    redirectWithError(AUTH_ROUTES.login, "invalid_input");
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    redirectWithError(AUTH_ROUTES.login, "invalid_credentials");
  }

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,account_status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
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

  if (profile.account_status === "pending_password_reset") {
    redirect(AUTH_ROUTES.resetPassword);
  }

  if (profile.account_status !== "active") {
    await supabase.auth.signOut();
    redirectWithError(SYSTEM_ROUTES.accessPending, "access_not_assigned");
  }

  const canAccessApp = await userCanAccessApp(data.user.id);

  if (!canAccessApp) {
    await supabase.auth.signOut();
    redirectWithError(SYSTEM_ROUTES.accessPending, "access_not_assigned");
  }

  const { error: loginUpdateError } = await admin
    .from("profiles")
    .update({
      last_login_at: new Date().toISOString(),
      failed_login_count: 0,
    })
    .eq("id", data.user.id);

  if (loginUpdateError) {
    console.error("Failed to update login metadata:", loginUpdateError.message);
  }

  const roleKey = await getUserRoleKey(data.user.id);
  const nextPath = getSafeNextPath(formData.get("next"));

  revalidatePath("/", "layout");

  if (nextPath) {
    redirect(nextPath);
  }

  if (roleKey) {
    redirect(getDefaultRouteForRole(roleKey));
  }

  redirect(SYSTEM_ROUTES.dashboard);
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
      redirectTo: `${getAppUrl()}${AUTH_ROUTES.callback}?next=${AUTH_ROUTES.resetPassword}`,
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

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    redirectWithError(AUTH_ROUTES.resetPassword, "password_update_failed");
  }

  const admin = createSupabaseAdminClient();
  const canAccessApp = await userCanAccessApp(user.id);

  if (canAccessApp) {
    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({
        account_status: "active",
        force_password_change: false,
        invite_accepted_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .in("account_status", ["invited", "pending_password_reset"]);

    if (profileUpdateError) {
      console.error(
        "Failed to update password reset profile state:",
        profileUpdateError.message,
      );
    }

    const { error: auditError } = await admin.from("audit_logs").insert({
      actor_user_id: user.id,
      action: "auth.password_updated",
      entity_type: "profiles",
      entity_id: user.id,
      new_value: {
        account_status: "active",
        force_password_change: false,
      },
      reason: "User completed password update.",
    });

    if (auditError) {
      console.error("Failed to write password update audit log:", auditError.message);
    }
  }

  revalidatePath("/", "layout");

  const roleKey = await getUserRoleKey(user.id);

  if (!roleKey || !canAccessApp) {
    redirectWithError(SYSTEM_ROUTES.accessPending, "access_not_assigned");
  }

  redirect(getDefaultRouteForRole(roleKey));
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

  const admin = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
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

  if (!["invited", "pending_password_reset"].includes(profile.account_status)) {
    redirect(SYSTEM_ROUTES.dashboard);
  }

  const canAccessApp = await userCanAccessApp(user.id);

  if (!canAccessApp) {
    redirectWithError(SYSTEM_ROUTES.accessPending, "access_not_assigned");
  }

  const { error: passwordError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (passwordError) {
    redirectWithError(AUTH_ROUTES.acceptInvite, "password_update_failed");
  }

  const { error: profileUpdateError } = await admin
    .from("profiles")
    .update({
      account_status: "active",
      force_password_change: false,
      invite_accepted_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .in("account_status", ["invited", "pending_password_reset"]);

  if (profileUpdateError) {
    redirectWithError(AUTH_ROUTES.acceptInvite, "password_update_failed");
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_user_id: user.id,
    action: "users.invite_accepted",
    entity_type: "profiles",
    entity_id: user.id,
    new_value: {
      account_status: "active",
      force_password_change: false,
    },
    reason: "User accepted invite and set password.",
  });

  if (auditError) {
    console.error("Failed to write invite accepted audit log:", auditError.message);
  }

  revalidatePath("/", "layout");

  const roleKey = await getUserRoleKey(user.id);

  if (!roleKey) {
    redirectWithError(SYSTEM_ROUTES.accessPending, "access_not_assigned");
  }

  redirect(getDefaultRouteForRole(roleKey));
}

export async function signOutAction(): Promise<never> {
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirectWithSuccess(AUTH_ROUTES.login, "signed_out");
}