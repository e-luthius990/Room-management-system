import "server-only";

import type { CurrentUserContext } from "@/lib/auth/types";
import { getManagerDashboardData } from "@/lib/queries/manager/get-manager-dashboard";

export type ManagerDashboardMetrics = {
  totalRooms: number;
  vacantReadyRooms: number;
  occupiedRooms: number;
  reservedRooms: number;
  pendingCheckInRooms: number;
  pendingCheckoutRooms: number;
  outOfServiceRooms: number;
  managerHoldRooms: number;
  activeStays: number;
  expectedArrivals: number;
  dueDepartures: number;
  guestsInsideCamp: number;
  guestsExitedSecurity: number;
  recentlyExitedGuests: number;
};

/**
 * Compatibility wrapper for older report/dashboard pages.
 *
 * Must receive currentUser so manager metrics remain camp-scoped.
 * Do not call getManagerDashboardData() without currentUser.
 */
export async function getManagerDashboardMetrics(
  currentUser: CurrentUserContext,
): Promise<ManagerDashboardMetrics> {
  const dashboard = await getManagerDashboardData(currentUser);
  const { summary } = dashboard;

  return {
    totalRooms: summary.totalRooms,
    vacantReadyRooms: summary.availableRooms,
    occupiedRooms: summary.occupiedRooms,
    reservedRooms: summary.reservedRooms,
    pendingCheckInRooms: summary.pendingCheckInRooms,
    pendingCheckoutRooms: summary.pendingCheckoutRooms,
    outOfServiceRooms: summary.outOfServiceRooms,
    managerHoldRooms: summary.managerHoldRooms,
    activeStays: summary.currentGuests,
    expectedArrivals: summary.pendingCheckInRooms,
    dueDepartures: summary.dueDepartures,
    guestsInsideCamp: summary.guestsInsideCamp,
    guestsExitedSecurity: summary.guestsExitedSecurity,
    recentlyExitedGuests: summary.recentlyExitedGuests,
  };
}