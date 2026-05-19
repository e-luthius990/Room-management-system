export const AUTH_ROUTES = {
  login: "/auth/login",
  callback: "/auth/callback",
  acceptInvite: "/auth/accept-invite",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
} as const;

export const SYSTEM_ROUTES = {
  dashboard: "/dashboard",
  accessPending: "/access-pending",
  accessDenied: "/access-denied",
  accountSuspended: "/account-suspended",
} as const;

function routeSegment(value: string): string {
  return encodeURIComponent(value);
}

function queryValue(value: string): string {
  return encodeURIComponent(value);
}

export const APP_ROUTES = {
  dashboard: "/dashboard",

  dashboards: {
    reception: "/dashboard/reception",
    security: "/dashboard/security",
    campManager: "/dashboard/camp-manager",
    executive: "/dashboard/executive",
  },

  manager: {
    home: "/dashboard/camp-manager",

    rooms: {
      board: "/room-board",
      available: "/room-board?status=vacant_ready",
      occupied: "/room-board?status=occupied",
    },

    guests: {
      current: "/stays?view=current",
      exited: "/stays?view=exited",
    },
  },

  reception: {
    home: "/dashboard/reception",
    securityHandoffs: "/reception/security-handoffs",
    securityHandoffDetail: (securityEventId: string) =>
      `/reception/security-handoffs/${routeSegment(securityEventId)}`,
  },

  rooms: {
    board: "/room-board",
    list: "/rooms",
    new: "/rooms/new",
    detail: (roomId: string) => `/rooms/${routeSegment(roomId)}`,
    edit: (roomId: string) => `/rooms/${routeSegment(roomId)}/edit`,
    qrCodes: "/rooms/qr-codes",
  },

  buildings: {
    list: "/buildings",
    new: "/buildings/new",
    detail: (buildingId: string) => `/buildings/${routeSegment(buildingId)}`,
    edit: (buildingId: string) =>
      `/buildings/${routeSegment(buildingId)}/edit`,
  },

  reservations: {
    list: "/reservations",
    new: "/reservations/new",
    detail: (reservationId: string) =>
      `/reservations/${routeSegment(reservationId)}`,
    edit: (reservationId: string) =>
      `/reservations/${routeSegment(reservationId)}/edit`,
    newFromSecurityHandoff: (securityEventId: string) =>
      `/reservations/new?securityEventId=${queryValue(securityEventId)}`,
  },

  allocations: {
    list: "/allocations",
    new: "/allocations/new",
    detail: (allocationId: string) =>
      `/allocations/${routeSegment(allocationId)}`,
    newFromSecurityHandoff: (securityEventId: string) =>
      `/allocations/new?securityEventId=${queryValue(securityEventId)}`,
  },

  stays: {
    list: "/stays",
    detail: (stayId: string) => `/stays/${routeSegment(stayId)}`,
    checkIn: "/stays/check-in",
    checkInFromSecurityHandoff: (securityEventId: string) =>
      `/stays/check-in?securityEventId=${queryValue(securityEventId)}`,
    checkOut: (stayId: string) => `/stays/${routeSegment(stayId)}/check-out`,
  },

  guests: {
    list: "/guests",
    new: "/guests/new",
    detail: (guestId: string) => `/guests/${routeSegment(guestId)}`,
    edit: (guestId: string) => `/guests/${routeSegment(guestId)}/edit`,
    documents: (guestId: string) =>
      `/guests/${routeSegment(guestId)}/documents`,
  },

  groups: {
    list: "/groups",
    new: "/groups/new",
    detail: (groupId: string) => `/groups/${routeSegment(groupId)}`,
    edit: (groupId: string) => `/groups/${routeSegment(groupId)}/edit`,
  },

  security: {
    home: "/dashboard/security",
    review: "/security",
    gate: "/security/gate",
    pendingReception: "/security/pending-reception",
    newGuest: "/security/guests/new",
    guestProfile: (guestId: string) =>
      `/security/guests/${routeSegment(guestId)}`,

    /**
     * Backward-compatible alias.
     * Prefer APP_ROUTES.security.review for the main security register.
     */
    clearances: "/security",
  },

  reports: {
    home: "/reports",
    occupancy: "/reports/occupancy",
    guests: "/reports/guests",
    rooms: "/reports/rooms",
    exports: "/reports/exports",
  },

  admin: {
    home: "/admin",
    users: "/admin/users",
    roles: "/admin/roles",
    permissions: "/admin/permissions",
    camps: "/admin/camps",
    buildings: "/admin/buildings",
    roomTypes: "/admin/room-types",
    amenities: "/admin/amenities",
    imports: "/admin/imports",
    exports: "/admin/exports",
    auditLogs: "/admin/audit-logs",
    settings: "/admin/settings",
  },
} as const;