import "server-only";

import { notFound } from "next/navigation";
import { hasAnyPermission, hasPermission } from "@/lib/auth/permissions";
import { requireAuth } from "@/lib/auth/require-auth";
import type { CurrentUserContext } from "@/lib/auth/types";

export async function requirePermission(
  permission: string,
): Promise<CurrentUserContext> {
  const currentUser = await requireAuth();

  if (!currentUser.role.canAccessSystem) {
    notFound();
  }

  if (!hasPermission(currentUser, permission)) {
    notFound();
  }

  return currentUser;
}

export async function requireAnyPermission(
  permissions: readonly string[],
): Promise<CurrentUserContext> {
  const currentUser = await requireAuth();

  if (!currentUser.role.canAccessSystem) {
    notFound();
  }

  if (!hasAnyPermission(currentUser, permissions)) {
    notFound();
  }

  return currentUser;
}