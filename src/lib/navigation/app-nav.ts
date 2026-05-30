// src/lib/navigation/app-nav.ts

import type { CurrentUserContext, RoleKey } from "@/lib/auth/types";
import { hasAnyPermission, SYSTEM_ROLES } from "@/lib/auth/permissions";
import { APP_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";

export type AppNavIcon =
  | "layout-dashboard"
  | "bell"
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
  | "file-down"
  | "building-2";

export type AppNavItem = {
  label: string;
  href: string;
  icon: AppNavIcon;
  permissions: readonly string[];
  exact?: boolean;
  badgeCount?: number;
};

const DASHBOARD_PERMISSIONS = [
  "dashboard.view",
  "rooms.view",
  "reservations.view",
  "expected_arrivals.view",
  "allocations.view",
  "stays.view",
  "stays.view_current",
  "field_absences.view",
  "security.view_gate_dashboard",
  "reception.handle_security_handoffs",
  "reports.view_occupancy",
  "reports.view_guests",
  "reports.view_rooms",
] as const;

function createDashboardNavItem(
  href: string = SYSTEM_ROUTES.dashboard,
): AppNavItem {
  return {
    label: "Dashboard",
    href,
    icon: "layout-dashboard",
    permissions: DASHBOARD_PERMISSIONS,
    exact: true,
  };
}

const DASHBOARD_NAV_ITEM = createDashboardNavItem();
const ADMIN_DASHBOARD_NAV_ITEM = createDashboardNavItem(APP_ROUTES.admin.home);
const EXECUTIVE_DASHBOARD_NAV_ITEM = createDashboardNavItem(
  APP_ROUTES.dashboards.executive,
);
const RECEPTION_DASHBOARD_NAV_ITEM = createDashboardNavItem(
  APP_ROUTES.dashboards.reception,
);
const SECURITY_DASHBOARD_NAV_ITEM = createDashboardNavItem(
  APP_ROUTES.dashboards.security,
);

const CAMP_MANAGER_NAV_ITEMS = [
  createDashboardNavItem(APP_ROUTES.manager.home),
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
    label: "Field Absences",
    href: APP_ROUTES.fieldAbsences.list,
    icon: "clipboard-check",
    permissions: ["field_absences.view"],
  },
  {
    label: "Expected Arrivals",
    href: APP_ROUTES.reception.expectedArrivals,
    icon: "calendar-days",
    permissions: ["expected_arrivals.view"],
  },
  {
    label: "Exited Guests",
    href: APP_ROUTES.manager.guests.exited,
    icon: "clipboard-check",
    permissions: ["stays.view_history"],
  },
  {
    label: "Data Import",
    href: APP_ROUTES.manager.data.imports,
    icon: "file-up",
    permissions: ["data.import", "imports.rooms", "imports.guests"],
  },
  {
    label: "Data Export",
    href: APP_ROUTES.manager.data.exports,
    icon: "file-down",
    permissions: [
      "data.export",
      "exports.reports",
      "reports.export_csv",
      "reports.export_excel",
      "reports.export_pdf",
    ],
  },
] as const satisfies readonly AppNavItem[];

const RECEPTIONIST_NAV_ITEMS = [
  RECEPTION_DASHBOARD_NAV_ITEM,
  {
  label: "Guests",
  href: APP_ROUTES.guests.list,
  icon: "users",
  permissions: ["guests.view"],
},
  {
    label: "Security Handoffs",
    href: APP_ROUTES.reception.securityHandoffs,
    icon: "shield-check",
    permissions: ["reception.handle_security_handoffs"],
  },
  {
    label: "Expected Arrivals",
    href: APP_ROUTES.reception.expectedArrivals,
    icon: "calendar-days",
    permissions: ["expected_arrivals.view"],
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
  {
    label: "Field Absences",
    href: APP_ROUTES.fieldAbsences.list,
    icon: "clipboard-check",
    permissions: ["field_absences.view"],
  },
] as const satisfies readonly AppNavItem[];

const SECURITY_NAV_ITEMS = [
  SECURITY_DASHBOARD_NAV_ITEM,
  {
    label: "Gate Dashboard",
    href: APP_ROUTES.security.gate,
    icon: "shield-check",
    permissions: ["security.view_gate_dashboard"],
  },
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
] as const satisfies readonly AppNavItem[];

export const APP_NAV_ITEMS = [
  DASHBOARD_NAV_ITEM,
  {
    label: "Room Board",
    href: APP_ROUTES.rooms.board,
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
    label: "Expected Arrivals",
    href: APP_ROUTES.reception.expectedArrivals,
    icon: "calendar-days",
    permissions: ["expected_arrivals.view"],
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
    label: "Field Absences",
    href: APP_ROUTES.fieldAbsences.list,
    icon: "clipboard-check",
    permissions: ["field_absences.view"],
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
] as const satisfies readonly AppNavItem[];

export const ADMIN_NAV_ITEMS = [
  {
    label: "Users",
    href: APP_ROUTES.admin.users,
    icon: "user-cog",
    permissions: ["users.view"],
  },
  {
    label: "Camps",
    href: APP_ROUTES.admin.camps,
    icon: "building-2",
    permissions: ["camps.view"],
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
    label: "Room Types",
    href: "/admin/room-types",
    icon: "bed",
    permissions: ["settings.update_room_types"],
  },
  {
    label: "Amenities",
    href: "/admin/amenities",
    icon: "settings",
    permissions: ["rooms.manage_amenities"],
  },
  {
    label: "Gate Dashboard",
    href: APP_ROUTES.security.gate,
    icon: "shield-check",
    permissions: ["security.view_gate_dashboard"],
  },
  {
    label: "Security Review",
    href: APP_ROUTES.security.review,
    icon: "shield-check",
    permissions: ["security.view_clearance"],
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
    icon: "file-down",
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
] as const satisfies readonly AppNavItem[];

const ROLE_NAV_ITEMS: Partial<Record<RoleKey, readonly AppNavItem[]>> = {
  super_admin: [ADMIN_DASHBOARD_NAV_ITEM, ...APP_NAV_ITEMS.slice(1)],
  system_admin: [ADMIN_DASHBOARD_NAV_ITEM, ...APP_NAV_ITEMS.slice(1)],
  camp_manager: CAMP_MANAGER_NAV_ITEMS,
  receptionist: RECEPTIONIST_NAV_ITEMS,
  security: SECURITY_NAV_ITEMS,
  executive_viewer: [EXECUTIVE_DASHBOARD_NAV_ITEM, ...APP_NAV_ITEMS.slice(1)],
};

function isSystemUser(currentUser: CurrentUserContext): boolean {
  return currentUser.isSystemActor || SYSTEM_ROLES.has(currentUser.role.key);
}

function getPrimaryNavItems(
  currentUser: CurrentUserContext,
): readonly AppNavItem[] {
  return ROLE_NAV_ITEMS[currentUser.role.key] ?? APP_NAV_ITEMS;
}

function canSeeNavItem(
  currentUser: CurrentUserContext,
  item: AppNavItem,
): boolean {
  return hasAnyPermission(currentUser, item.permissions);
}

export function getVisibleNavItems(
  currentUser: CurrentUserContext,
): AppNavItem[] {
  return getPrimaryNavItems(currentUser).filter((item) =>
    canSeeNavItem(currentUser, item),
  );
}

export function getVisibleAdminNavItems(
  currentUser: CurrentUserContext,
): AppNavItem[] {
  if (!isSystemUser(currentUser)) {
    return [];
  }

  return ADMIN_NAV_ITEMS.filter((item) => canSeeNavItem(currentUser, item));
}
