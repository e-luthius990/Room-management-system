import type { JSX } from "react";

import { LiveCampManagerDashboard } from "@/components/manager/live-camp-manager-dashboard";
import { OperationsSearchBox } from "@/components/search/operations-search-box";
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

function ManagerDashboardTopRail(): JSX.Element {
  return (
    <section className="ops-command">
      <div className="min-w-0 flex-1">
        <OperationsSearchBox
          scope="manager"
          placeholder="Search guests, rooms, phone, ID..."
        />
      </div>
    </section>
  );
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
    <div className="page-stack">
      <ManagerDashboardTopRail />

      <LiveCampManagerDashboard initialData={dashboard} />
    </div>
  );
}
