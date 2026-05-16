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
      `/reception/security-handoffs/${securityEventId}`,
  },

  rooms: {
    board: "/room-board",
    list: "/rooms",
    new: "/rooms/new",
    detail: (roomId: string) => `/rooms/${roomId}`,
    edit: (roomId: string) => `/rooms/${roomId}/edit`,
    qrCodes: "/rooms/qr-codes",
  },

  buildings: {
    list: "/buildings",
    new: "/buildings/new",
    detail: (buildingId: string) => `/buildings/${buildingId}`,
    edit: (buildingId: string) => `/buildings/${buildingId}/edit`,
  },

  reservations: {
    list: "/reservations",
    new: "/reservations/new",
    detail: (reservationId: string) => `/reservations/${reservationId}`,
    edit: (reservationId: string) => `/reservations/${reservationId}/edit`,
    newFromSecurityHandoff: (securityEventId: string) =>
      `/reservations/new?securityEventId=${securityEventId}`,
  },

  allocations: {
    list: "/allocations",
    new: "/allocations/new",
    detail: (allocationId: string) => `/allocations/${allocationId}`,
    newFromSecurityHandoff: (securityEventId: string) =>
      `/allocations/new?securityEventId=${securityEventId}`,
  },

  stays: {
    list: "/stays",
    detail: (stayId: string) => `/stays/${stayId}`,
    checkIn: "/stays/check-in",
    checkInFromSecurityHandoff: (securityEventId: string) =>
      `/stays/check-in?securityEventId=${securityEventId}`,
    checkOut: (stayId: string) => `/stays/${stayId}/check-out`,
  },

  guests: {
    list: "/guests",
    new: "/guests/new",
    detail: (guestId: string) => `/guests/${guestId}`,
    edit: (guestId: string) => `/guests/${guestId}/edit`,
    documents: (guestId: string) => `/guests/${guestId}/documents`,
  },

  groups: {
    list: "/groups",
    new: "/groups/new",
    detail: (groupId: string) => `/groups/${groupId}`,
    edit: (groupId: string) => `/groups/${groupId}/edit`,
  },

  security: {
    home: "/dashboard/security",
    review: "/security",
    gate: "/security/gate",
    pendingReception: "/security/pending-reception",
    newGuest: "/security/guests/new",
    guestProfile: (guestId: string) => `/security/guests/${guestId}`,

    /**
     * Kept only for backward compatibility with older imports.
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