import { requireAnyPermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { LiveCampManagerDashboard } from "@/components/manager/live-camp-manager-dashboard";
import { getManagerDashboardData } from "@/lib/queries/manager/get-manager-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CampManagerDashboardPage(): Promise<React.JSX.Element> {
  await requireAnyPermission([
    "dashboard.view",
    "rooms.view",
    "rooms.view_board",
    "stays.view",
    "stays.view_current",
    "stays.view_history",
    "security.view_presence",
  ]);

  const dashboard = await getManagerDashboardData();

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Camp manager"
        title="Live camp dashboard"
        description="Live operational view of available rooms, occupied rooms, checked-in guests, exited guests, and security presence."
      />

      <LiveCampManagerDashboard initialData={dashboard} />
    </div>
  );
}
