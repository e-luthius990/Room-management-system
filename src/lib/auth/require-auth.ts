import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";
import {
  getCurrentUser,
  isActiveAccountStatus,
  isBlockedAccountStatus,
  isPendingAccountStatus,
} from "@/lib/auth/get-current-user";
import type { CurrentUserContext } from "@/lib/auth/types";

export const requireAuth = cache(
  async (): Promise<CurrentUserContext> => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      redirect(AUTH_ROUTES.login);
    }

    const status = currentUser.profile.account_status;

    if (isBlockedAccountStatus(status)) {
      redirect(SYSTEM_ROUTES.accountSuspended);
    }

    if (isPendingAccountStatus(status)) {
      redirect(SYSTEM_ROUTES.accessPending);
    }

    if (!isActiveAccountStatus(status)) {
      redirect(SYSTEM_ROUTES.accessPending);
    }

    if (!currentUser.role.canAccessSystem) {
      redirect(SYSTEM_ROUTES.accessPending);
    }

    if (!currentUser.isSystemActor && currentUser.campAccess.length === 0) {
      redirect(SYSTEM_ROUTES.accessPending);
    }

    return currentUser;
  },
);