import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";
import { hasAnyPermission, hasPermission } from "@/lib/auth/permissions";
import { requireAuth } from "@/lib/auth/require-auth";
import type { CurrentUserContext } from "@/lib/auth/types";

export const requirePermission = cache(
  async (permission: string): Promise<CurrentUserContext> => {
    const currentUser = await requireAuth();

    if (!currentUser.role.canAccessSystem) {
      notFound();
    }

    if (!hasPermission(currentUser, permission)) {
      notFound();
    }

    return currentUser;
  },
);

export const requireAnyPermission = cache(
  async (permissions: readonly string[]): Promise<CurrentUserContext> => {
    const currentUser = await requireAuth();

    if (!currentUser.role.canAccessSystem) {
      notFound();
    }

    if (!hasAnyPermission(currentUser, permissions)) {
      notFound();
    }

    return currentUser;
  },
);