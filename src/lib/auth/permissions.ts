import type { CurrentCampAccess } from "@/lib/auth/types";
import type {
  CampAccessLevel,
  CurrentUserContext,
  RoleKey,
} from "@/lib/auth/types";

export const SYSTEM_ROLES = new Set<RoleKey>([
  "super_admin",
  "system_admin",
]);

export const ACCESS_LEVEL_RANK: Record<CampAccessLevel, number> = {
  viewer: 1,
  operator: 2,
  supervisor: 3,
  manager: 4,
  admin: 5,
};

/**
 * Camp manager has operational oversight plus controlled data import/export access.
 * Avoid workflow mutation permissions here unless the business explicitly approves them.
 */
export const CAMP_MANAGER_PERMISSIONS = [
  "dashboard.view",

  "rooms.view",
  "rooms.view_board",

  "stays.view",
  "stays.view_current",
  "stays.view_history",

  "expected_arrivals.view",
  "expected_arrivals.create",
  "expected_arrivals.update",
  "expected_arrivals.cancel",
  "expected_arrivals.mark_no_show",
  "expected_arrivals.allocate",

  "field_absences.view",
  "field_absences.create",
  "field_absences.update",
  "field_absences.mark_returned",
  "field_absences.cancel",

  "security.view_presence",

  "data.import",
  "data.export",

  "imports.rooms",
  "imports.guests",

  "exports.reports",
  "reports.export_csv",
  "reports.export_excel",
  "reports.export_pdf",
] as const;

function canUseSystem(user: CurrentUserContext): boolean {
  return user.role.canAccessSystem;
}

function isSuperAdmin(user: CurrentUserContext): boolean {
  return user.role.key === "super_admin";
}

function hasPermissionKey(
  permissions: readonly string[],
  permission: string,
): boolean {
  return permissions.includes(permission);
}

export function hasPermission(
  user: CurrentUserContext,
  permission: string,
): boolean {
  if (!canUseSystem(user)) {
    return false;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  return hasPermissionKey(user.permissions, permission);
}

export function hasAnyPermission(
  user: CurrentUserContext,
  permissions: readonly string[],
): boolean {
  if (!canUseSystem(user)) {
    return false;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  return permissions.some((permission) =>
    hasPermissionKey(user.permissions, permission),
  );
}

export function hasAllPermissions(
  user: CurrentUserContext,
  permissions: readonly string[],
): boolean {
  if (!canUseSystem(user)) {
    return false;
  }

  if (isSuperAdmin(user)) {
    return true;
  }

  return permissions.every((permission) =>
    hasPermissionKey(user.permissions, permission),
  );
}

export function hasCampAccess(
  user: CurrentUserContext,
  campId: string,
  minimumLevel: CampAccessLevel = "viewer",
): boolean {
  if (!canUseSystem(user)) {
    return false;
  }

  if (user.isSystemActor) {
    return true;
  }

  const requiredRank = ACCESS_LEVEL_RANK[minimumLevel];

  return user.campAccess.some((access: CurrentCampAccess) => {
    return (
      access.camp_id === campId &&
      ACCESS_LEVEL_RANK[access.access_level] >= requiredRank
    );
  });
}

export const ROUTE_PERMISSIONS = {
  dashboard: [
    "dashboard.view",
    "rooms.view",
    "rooms.view_board",
    "stays.view",
    "stays.view_current",
    "security.view_gate_dashboard",
  ],

  campManagerDashboard: [
    "dashboard.view",
    "rooms.view",
    "rooms.view_board",
    "stays.view_current",
    "stays.view_history",
    "security.view_presence",
  ],

  roomBoard: ["rooms.view", "rooms.view_board"],
  rooms: ["rooms.view"],
  availableRooms: ["rooms.view", "rooms.view_board"],
  occupiedRooms: ["rooms.view", "rooms.view_board"],

  managerImports: ["data.import", "imports.rooms", "imports.guests"],
  managerExports: [
    "data.export",
    "exports.reports",
    "reports.export_csv",
    "reports.export_excel",
    "reports.export_pdf",
  ],

  createRoom: ["rooms.create"],
  updateRoom: ["rooms.update"],
  roomQrCodes: ["rooms.view"],

  roomStatus: ["room_status.view", "room_status.change"],
  changeRoomStatus: ["room_status.change"],

  guests: ["guests.view"],
  createGuest: ["guests.create"],
  updateGuest: ["guests.update"],
  guestDocuments: ["guest_documents.view"],
  uploadGuestDocument: ["guest_documents.upload"],

  guestGroups: ["groups.view"],
  createGuestGroup: ["groups.create"],
  updateGuestGroup: ["groups.update"],

  reservations: ["reservations.view"],
  createReservation: ["reservations.create"],
  updateReservation: ["reservations.update"],
  cancelReservation: ["reservations.cancel"],
  checkInReservation: ["reservations.convert_to_checkin"],
  reservationArrivals: ["reservations.view_arrivals"],
  reservationDepartures: ["reservations.view_departures"],

  expectedArrivals: ["expected_arrivals.view"],
  createExpectedArrival: ["expected_arrivals.create"],
  updateExpectedArrival: ["expected_arrivals.update"],
  cancelExpectedArrival: ["expected_arrivals.cancel"],
  markExpectedArrivalNoShow: ["expected_arrivals.mark_no_show"],
  allocateExpectedArrival: ["expected_arrivals.allocate"],

  allocations: ["allocations.view"],
  createAllocation: ["allocations.create"],
  cancelAllocation: ["allocations.cancel"],

  stays: ["stays.view"],
  currentStays: ["stays.view_current", "stays.view"],
  exitedStays: ["stays.view_history", "stays.view"],

  createStay: ["stays.create"],
  updateStay: ["stays.update", "stays.check_in", "stays.check_out"],
  checkInStay: ["stays.check_in"],
  checkOutStay: ["stays.check_out"],

  fieldAbsences: ["field_absences.view"],
  createFieldAbsence: ["field_absences.create"],
  updateFieldAbsence: ["field_absences.update"],
  markFieldAbsenceReturned: ["field_absences.mark_returned"],
  cancelFieldAbsence: ["field_absences.cancel"],

  securityPresence: ["security.view_presence"],

  security: ["security.view_gate_dashboard"],
  securityClearances: ["security.create_clearance_event"],

  reports: [
    "reports.view_occupancy",
    "reports.view_guests",
    "reports.view_rooms",
  ],
  exportReports: [
    "exports.reports",
    "reports.export_csv",
    "reports.export_excel",
    "reports.export_pdf",
  ],

  camps: ["camps.view"],

  buildings: ["buildings.view"],
  createBuilding: ["buildings.create"],
  updateBuilding: ["buildings.update"],

  roomTypes: ["room_types.view"],
  amenities: ["rooms.manage_amenities"],

  users: ["users.view"],
  inviteUsers: ["users.invite"],
  updateUsers: ["users.update"],
  suspendUsers: ["users.suspend"],
  disableUsers: ["users.disable"],
  changeUserRole: ["users.change_role"],
  changeUserCampAccess: ["users.change_camp_access"],

  roles: ["roles.view"],
  updateRoles: ["roles.update"],
  assignRolePermissions: ["roles.assign_permissions"],

  imports: ["imports.rooms", "imports.guests", "imports.users"],
  exports: [
    "exports.reports",
    "reports.export_csv",
    "reports.export_excel",
    "reports.export_pdf",
  ],

  auditLogs: ["audit_logs.view"],
  sensitiveAuditLogs: ["audit_logs.view_sensitive"],

  settings: ["settings.view"],
  updateSystemSettings: ["system_settings.update"],
} as const;