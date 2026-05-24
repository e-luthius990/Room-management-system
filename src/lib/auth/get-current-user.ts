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
import { SYSTEM_ROLES } from "@/lib/auth/permissions";

type AdminClient = SupabaseClient<Database>;
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type RpcError = {
  message: string;
};

type UntypedRpcClient = {
  rpc(
    fn: "get_current_user_context_snapshot",
    args: { p_user_id: string },
  ): Promise<{
    data: unknown;
    error: RpcError | null;
  }>;
};

type CurrentUserContextSnapshot = {
  profile: ProfileRow;
  role: CurrentRole;
  permissions: string[];
  campAccess: CurrentCampAccess[];
};

const APP_ACCESS_ROLE_KEYS = new Set<string>([
  "super_admin",
  "system_admin",
  "camp_manager",
  "receptionist",
  "security",
  "executive_viewer",
]);

const CAMP_ACCESS_LEVEL_KEYS = new Set<string>([
  "viewer",
  "operator",
  "supervisor",
  "manager",
  "admin",
]);

const AUTH_CONTEXT_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.AUTH_DEBUG_TIMING === "true";

function createAuthContextTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!AUTH_CONTEXT_TIMING_ENABLED) {
      return;
    }

    console.info(
      `[${scope}] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
    );
  };
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAppAccessRoleKey(value: unknown): value is RoleKey {
  return typeof value === "string" && APP_ACCESS_ROLE_KEYS.has(value);
}

function isCampAccessLevel(value: unknown): value is CampAccessLevel {
  return typeof value === "string" && CAMP_ACCESS_LEVEL_KEYS.has(value);
}

function parseProfile(value: unknown): ProfileRow | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== "string") {
    return null;
  }

  return value as ProfileRow;
}

function parseRole(value: unknown): CurrentRole | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, key, name, canAccessSystem } = value;

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    canAccessSystem !== true ||
    !isAppAccessRoleKey(key)
  ) {
    return null;
  }

  return {
    id,
    key,
    name,
    canAccessSystem: true,
  };
}

function parsePermissions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.filter((permission): permission is string => typeof permission === "string")),
  ).sort();
}

function parseCampAccess(value: unknown): CurrentCampAccess[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): CurrentCampAccess[] => {
    if (!isRecord(item)) {
      return [];
    }

    const {
      id,
      camp_id: campId,
      access_level: accessLevel,
      camp_name: campName,
      camp_code: campCode,
    } = item;

    if (
      typeof id !== "string" ||
      typeof campId !== "string" ||
      !isCampAccessLevel(accessLevel) ||
      typeof campName !== "string" ||
      typeof campCode !== "string"
    ) {
      return [];
    }

    return [
      {
        id,
        camp_id: campId,
        access_level: accessLevel,
        camp_name: campName,
        camp_code: campCode,
      },
    ];
  });
}

function parseCurrentUserContextSnapshot(
  value: unknown,
): CurrentUserContextSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const profile = parseProfile(value.profile);
  const role = parseRole(value.role);

  if (!profile || !role) {
    return null;
  }

  return {
    profile,
    role,
    permissions: parsePermissions(value.permissions),
    campAccess: parseCampAccess(value.campAccess),
  };
}

async function loadCurrentUserContextSnapshot(
  admin: AdminClient,
  userId: string,
): Promise<CurrentUserContextSnapshot | null> {
  const rpcClient = admin as unknown as UntypedRpcClient;

  const { data, error } = await rpcClient.rpc(
    "get_current_user_context_snapshot",
    {
      p_user_id: userId,
    },
  );

  if (error) {
    throw new Error(`Failed to load current user context: ${error.message}`);
  }

  return parseCurrentUserContextSnapshot(data);
}

export const getCurrentUser = cache(
  async (): Promise<CurrentUserContext | null> => {
    const mark = createAuthContextTimer("auth:getCurrentUser");

    const supabase = await createServerSupabaseClient();
    mark("server supabase client created");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    mark("auth.getUser completed");

    if (userError || !user) {
      return null;
    }

    const admin = createSupabaseAdminClient();
    mark("admin client created");

    const snapshot = await loadCurrentUserContextSnapshot(admin, user.id);
    mark("current user context snapshot loaded");

    if (!snapshot?.profile || !snapshot.role.canAccessSystem) {
      return null;
    }

    const currentUser: CurrentUserContext = {
      authUser: user,
      profile: snapshot.profile,
      role: snapshot.role,
      permissions: snapshot.permissions,
      campAccess: snapshot.campAccess,
      isSystemActor: SYSTEM_ROLES.has(snapshot.role.key),
    };

    mark("current user context prepared");

    return currentUser;
  },
);