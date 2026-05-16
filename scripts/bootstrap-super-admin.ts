import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { createClient, type User } from "@supabase/supabase-js";
import type { Database } from "../src/lib/db/types";

function requiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing ${key}.`);
  }

  return value;
}

const SUPABASE_URL = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const ADMIN_EMAIL = requiredEnv("BOOTSTRAP_ADMIN_EMAIL").trim().toLowerCase();
const ADMIN_FULL_NAME = requiredEnv("BOOTSTRAP_ADMIN_FULL_NAME").trim();
const ADMIN_PHONE = process.env.BOOTSTRAP_ADMIN_PHONE?.trim() || null;

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findAuthUserByEmail(email: string): Promise<User | null> {
  let page = 1;
  const perPage = 100;

  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const found = data.users.find((user) => {
      return user.email?.toLowerCase() === email.toLowerCase();
    });

    if (found) {
      return found;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function ensureInvitedAuthUser(): Promise<User> {
  const existingUser = await findAuthUserByEmail(ADMIN_EMAIL);

  if (existingUser) {
    return existingUser;
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    ADMIN_EMAIL,
    {
      data: {
        full_name: ADMIN_FULL_NAME,
      },
      redirectTo: `${APP_URL}/auth/callback?next=/auth/accept-invite`,
    },
  );

  if (error || !data.user) {
    throw new Error(`Failed to invite bootstrap admin: ${error?.message}`);
  }

  return data.user;
}

async function getRoleId(roleKey: string): Promise<string> {
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("key", roleKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load role ${roleKey}: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Role ${roleKey} does not exist.`);
  }

  return data.id;
}

async function ensureProfile(user: User): Promise<void> {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: ADMIN_FULL_NAME,
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      department: "Administration",
      job_title: "Super Admin",
      account_status: "invited",
      force_password_change: true,
      invited_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw new Error(`Failed to upsert profile: ${error.message}`);
  }
}

async function ensureUserRole(userId: string, roleId: string): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check user role: ${existingError.message}`);
  }

  if (existing) {
    return;
  }

  const { error } = await supabase.from("user_roles").insert({
    user_id: userId,
    role_id: roleId,
  });

  if (error) {
    throw new Error(`Failed to assign super_admin role: ${error.message}`);
  }
}

async function ensureCampAccess(userId: string): Promise<void> {
  const { data: camps, error: campsError } = await supabase
    .from("camps")
    .select("id,name")
    .eq("status", "active")
    .is("deleted_at", null);

  if (campsError) {
    throw new Error(`Failed to load camps: ${campsError.message}`);
  }

  for (const camp of camps ?? []) {
    const { data: existing, error: existingError } = await supabase
      .from("user_camp_access")
      .select("id")
      .eq("user_id", userId)
      .eq("camp_id", camp.id)
      .is("revoked_at", null)
      .maybeSingle();

    if (existingError) {
      throw new Error(
        `Failed to check camp access for ${camp.name}: ${existingError.message}`,
      );
    }

    if (existing) {
      continue;
    }

    const { error } = await supabase.from("user_camp_access").insert({
      user_id: userId,
      camp_id: camp.id,
      access_level: "admin",
    });

    if (error) {
      throw new Error(
        `Failed to grant camp access for ${camp.name}: ${error.message}`,
      );
    }
  }
}

async function writeAudit(userId: string): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: userId,
    action: "bootstrap.super_admin_created",
    entity_type: "profiles",
    entity_id: userId,
    new_value: {
      email: ADMIN_EMAIL,
      role: "super_admin",
    },
    reason: "Initial system bootstrap.",
  });

  if (error) {
    throw new Error(`Failed to write audit log: ${error.message}`);
  }
}

async function main(): Promise<void> {
  if (!ADMIN_EMAIL || !ADMIN_FULL_NAME) {
    throw new Error("Bootstrap admin email and full name are required.");
  }

  const user = await ensureInvitedAuthUser();
  const superAdminRoleId = await getRoleId("super_admin");

  await ensureProfile(user);
  await ensureUserRole(user.id, superAdminRoleId);
  await ensureCampAccess(user.id);
  await writeAudit(user.id);

  console.log("Bootstrap super admin prepared successfully.");
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log("Check the email inbox for the Supabase invite link.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});