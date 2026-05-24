import type { JSX } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { LiveCampManagerDashboard } from "@/components/manager/live-camp-manager-dashboard";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { getManagerDashboardData } from "@/lib/queries/manager/get-manager-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CAMP_MANAGER_DASHBOARD_PERMISSIONS = [
  "dashboard.view",
  "rooms.view",
  "rooms.view_board",
  "stays.view",
  "stays.view_current",
  "stays.view_history",
  "security.view_presence",
] as const;

const MANAGER_DASHBOARD_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.DASHBOARD_DEBUG_TIMING === "true";

function createManagerDashboardTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!MANAGER_DASHBOARD_TIMING_ENABLED) {
      return;
    }

    console.info(
      `[${scope}] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
    );
  };
}

export default async function CampManagerDashboardPage(): Promise<JSX.Element> {
  const mark = createManagerDashboardTimer("dashboard:camp-manager");

  const currentUser = await requireAnyPermission([
    ...CAMP_MANAGER_DASHBOARD_PERMISSIONS,
  ]);
  mark("permission checked");

  const dashboard = await getManagerDashboardData(currentUser);
  mark("manager dashboard data loaded");

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Camp manager"
        title="Operations dashboard"
        description="Live camp-level visibility across room availability, occupancy, current guests, departures, and security presence."
      />

      <LiveCampManagerDashboard initialData={dashboard} />
    </div>
  );
}
