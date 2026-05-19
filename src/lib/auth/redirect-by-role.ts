import type { CurrentUserContext, RoleKey } from "@/lib/auth/types";
import { APP_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";

export function getDefaultRouteForRole(role: RoleKey): string {
  switch (role) {
    case "super_admin":
    case "system_admin":
      return APP_ROUTES.admin.home;

    case "camp_manager":
      return APP_ROUTES.dashboards.campManager;

    case "executive_viewer":
      return APP_ROUTES.dashboards.executive;

    case "receptionist":
      return APP_ROUTES.dashboards.reception;

    case "security":
      return APP_ROUTES.dashboards.security;

    default:
      return SYSTEM_ROUTES.accessDenied;
  }
}

export function getDefaultRouteForUser(user: CurrentUserContext): string {
  if (!user.role.canAccessSystem) {
    return SYSTEM_ROUTES.accessDenied;
  }

  return getDefaultRouteForRole(user.role.key);
}