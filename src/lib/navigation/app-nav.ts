import type { CurrentUserContext } from "@/lib/auth/types";
import { hasAnyPermission, SYSTEM_ROLES } from "@/lib/auth/permissions";
import { APP_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";

export type AppNavIcon =
  | "layout-dashboard"
  | "bed"
  | "users"
  | "calendar-days"
  | "clipboard-check"
  | "bar-chart-3"
  | "shield-check"
  | "settings"
  | "user-cog"
  | "scroll-text"
  | "file-up"
  | "building-2";

export type AppNavItem = {
  label: string;
  href: string;
  icon: AppNavIcon;
  permissions: readonly string[];
  exact?: boolean;
};

const DASHBOARD_NAV_ITEM: AppNavItem = {
  label: "Dashboard",
  href: SYSTEM_ROUTES.dashboard,
  icon: "layout-dashboard",
  permissions: [
    "dashboard.view",
    "rooms.view",
    "reservations.view",
    "allocations.view",
    "stays.view",
    "stays.view_current",
    "security.view_gate_dashboard",
    "reception.handle_security_handoffs",
    "reports.view_occupancy",
    "reports.view_guests",
    "reports.view_rooms",
  ],
  exact: true,
};

const CAMP_MANAGER_DASHBOARD_NAV_ITEM: AppNavItem = {
  label: "Dashboard",
  href: APP_ROUTES.manager.home,
  icon: "layout-dashboard",
  permissions: ["dashboard.view"],
  exact: true,
};

function isSystemUser(currentUser: CurrentUserContext): boolean {
  return currentUser.isSystemActor || SYSTEM_ROLES.has(currentUser.role.key);
}

function isReceptionist(currentUser: CurrentUserContext): boolean {
  return currentUser.role.key === "receptionist";
}

function isSecurityUser(currentUser: CurrentUserContext): boolean {
  return currentUser.role.key === "security";
}

function isCampManager(currentUser: CurrentUserContext): boolean {
  return currentUser.role.key === "camp_manager";
}

const CAMP_MANAGER_NAV_ITEMS: AppNavItem[] = [
  CAMP_MANAGER_DASHBOARD_NAV_ITEM,
  {
    label: "Room Board",
    href: APP_ROUTES.manager.rooms.board,
    icon: "bed",
    permissions: ["rooms.view_board"],
  },
  {
    label: "Available Rooms",
    href: APP_ROUTES.manager.rooms.available,
    icon: "bed",
    permissions: ["rooms.view"],
  },
  {
    label: "Occupied Rooms",
    href: APP_ROUTES.manager.rooms.occupied,
    icon: "building-2",
    permissions: ["rooms.view"],
  },
  {
    label: "Checked-in Guests",
    href: APP_ROUTES.manager.guests.current,
    icon: "users",
    permissions: ["stays.view_current"],
  },
  {
    label: "Exited Guests",
    href: APP_ROUTES.manager.guests.exited,
    icon: "clipboard-check",
    permissions: ["stays.view_history"],
  },
];

const RECEPTIONIST_NAV_ITEMS: AppNavItem[] = [
  {
    label: "Security Handoffs",
    href: APP_ROUTES.reception.securityHandoffs,
    icon: "shield-check",
    permissions: ["reception.handle_security_handoffs"],
  },
  {
    label: "Reservations",
    href: APP_ROUTES.reservations.list,
    icon: "calendar-days",
    permissions: ["reservations.view"],
  },
  {
    label: "Room Allocation",
    href: APP_ROUTES.allocations.list,
    icon: "bed",
    permissions: ["allocations.view"],
  },
  {
    label: "Room Board",
    href: APP_ROUTES.rooms.board,
    icon: "bed",
    permissions: ["rooms.view"],
  },
  {
    label: "Check-in",
    href: `${APP_ROUTES.stays.list}?view=reserved`,
    icon: "clipboard-check",
    permissions: ["stays.check_in"],
  },
  {
    label: "Check-out",
    href: `${APP_ROUTES.stays.list}?view=check-outs`,
    icon: "clipboard-check",
    permissions: ["stays.check_out"],
  },
];

const SECURITY_NAV_ITEMS: AppNavItem[] = [
  {
    label: "Security Review",
    href: APP_ROUTES.security.review,
    icon: "shield-check",
    permissions: ["security.view_clearance", "guests.view"],
    exact: true,
  },
  {
    label: "Register Visitor",
    href: APP_ROUTES.security.newGuest,
    icon: "users",
    permissions: ["security.create_guest_intake"],
  },
  {
    label: "Pending Reception",
    href: APP_ROUTES.security.pendingReception,
    icon: "clipboard-check",
    permissions: ["security.view_clearance"],
  },
];

export const APP_NAV_ITEMS: AppNavItem[] = [
  DASHBOARD_NAV_ITEM,
  {
    label: "Room Board",
    href: APP_ROUTES.rooms.board,
    icon: "bed",
    permissions: ["rooms.view"],
  },
  {
    label: "Buildings",
    href: APP_ROUTES.buildings.list,
    icon: "building-2",
    permissions: ["buildings.view"],
  },
  {
    label: "Rooms",
    href: APP_ROUTES.rooms.list,
    icon: "bed",
    permissions: ["rooms.view"],
  },
  {
    label: "Guests",
    href: APP_ROUTES.guests.list,
    icon: "users",
    permissions: ["guests.view"],
  },
  {
    label: "Reservations",
    href: APP_ROUTES.reservations.list,
    icon: "calendar-days",
    permissions: ["reservations.view"],
  },
  {
    label: "Room Allocation",
    href: APP_ROUTES.allocations.list,
    icon: "bed",
    permissions: ["allocations.view"],
  },
  {
    label: "Check-in",
    href: `${APP_ROUTES.stays.list}?view=reserved`,
    icon: "clipboard-check",
    permissions: ["stays.check_in"],
  },
  {
    label: "Check-out",
    href: `${APP_ROUTES.stays.list}?view=check-outs`,
    icon: "clipboard-check",
    permissions: ["stays.check_out"],
  },
  {
    label: "Security",
    href: APP_ROUTES.security.review,
    icon: "shield-check",
    permissions: ["security.view_clearance", "guests.view"],
  },
  {
    label: "Security Handoffs",
    href: APP_ROUTES.reception.securityHandoffs,
    icon: "clipboard-check",
    permissions: ["reception.handle_security_handoffs"],
  },
  {
    label: "Reports",
    href: APP_ROUTES.reports.home,
    icon: "bar-chart-3",
    permissions: [
      "reports.view_occupancy",
      "reports.view_guests",
      "reports.view_rooms",
    ],
  },
];

export const ADMIN_NAV_ITEMS: AppNavItem[] = [
  {
    label: "Users",
    href: APP_ROUTES.admin.users,
    icon: "user-cog",
    permissions: ["users.view"],
  },
  {
    label: "Roles",
    href: APP_ROUTES.admin.roles,
    icon: "shield-check",
    permissions: ["roles.view", "roles.update", "roles.assign_permissions"],
  },
  {
    label: "Camps",
    href: APP_ROUTES.admin.camps,
    icon: "building-2",
    permissions: ["camps.view"],
  },
  {
    label: "Imports",
    href: APP_ROUTES.admin.imports,
    icon: "file-up",
    permissions: ["imports.rooms", "imports.guests", "imports.users"],
  },
  {
    label: "Exports",
    href: APP_ROUTES.admin.exports,
    icon: "scroll-text",
    permissions: [
      "exports.reports",
      "reports.export_csv",
      "reports.export_excel",
      "reports.export_pdf",
    ],
  },
  {
    label: "Audit Logs",
    href: APP_ROUTES.admin.auditLogs,
    icon: "scroll-text",
    permissions: ["audit_logs.view"],
  },
  {
    label: "Settings",
    href: APP_ROUTES.admin.settings,
    icon: "settings",
    permissions: ["settings.view", "system_settings.update"],
  },
];

function getPrimaryNavItems(currentUser: CurrentUserContext): AppNavItem[] {
  if (isCampManager(currentUser)) {
    return CAMP_MANAGER_NAV_ITEMS;
  }

  if (isReceptionist(currentUser)) {
    return [DASHBOARD_NAV_ITEM, ...RECEPTIONIST_NAV_ITEMS];
  }

  if (isSecurityUser(currentUser)) {
    return [DASHBOARD_NAV_ITEM, ...SECURITY_NAV_ITEMS];
  }

  return APP_NAV_ITEMS;
}

export function getVisibleNavItems(
  currentUser: CurrentUserContext,
): AppNavItem[] {
  return getPrimaryNavItems(currentUser).filter((item) => {
    return hasAnyPermission(currentUser, item.permissions);
  });
}

export function getVisibleAdminNavItems(
  currentUser: CurrentUserContext,
): AppNavItem[] {
  if (!isSystemUser(currentUser)) {
    return [];
  }

  return ADMIN_NAV_ITEMS.filter((item) => {
    return hasAnyPermission(currentUser, item.permissions);
  });
}