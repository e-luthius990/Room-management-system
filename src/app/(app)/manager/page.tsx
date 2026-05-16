import Link from "next/link";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getManagerDashboardMetrics } from "@/lib/queries/reports/get-manager-dashboard-metrics";

export default async function ManagerDashboardPage() {
  await requireAnyPermission([
    "reports.view_dashboard",
    "reports.view_occupancy",
    "camps.view_occupancy",
    "vip.view",
  ]);

  const metrics = await getManagerDashboardMetrics();

  return (
    <div>
      <PageHeader
        title="Manager Dashboard"
        description="High-level operational posture across rooms, stays, arrivals, housekeeping, maintenance, inspections, and service requests."
        actions={
          <Link
            href="/reports"
            className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Reports
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Metric title="Total Rooms" value={metrics.totalRooms} />
        <Metric title="Vacant Ready" value={metrics.vacantReadyRooms} />
        <Metric title="Occupied Rooms" value={metrics.occupiedRooms} />
        <Metric title="Cleaning Queue" value={metrics.cleaningRooms} />
        <Metric
          title="Maintenance Blocked"
          value={metrics.maintenanceBlockedRooms}
        />
        <Metric title="Active Stays" value={metrics.activeStays} />
        <Metric title="Today Arrivals" value={metrics.expectedArrivals} />
        <Metric
          title="Housekeeping Tasks"
          value={metrics.pendingHousekeepingTasks}
        />
        <Metric
          title="Maintenance Tickets"
          value={metrics.openMaintenanceTickets}
        />
        <Metric
          title="Pending Inspections"
          value={metrics.pendingInspections}
        />
        <Metric
          title="Room Service Tasks"
          value={metrics.pendingRoomServiceTasks}
        />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <QuickLink title="Room Board" href="/room-board" />
        <QuickLink title="Gate Dashboard" href="/security/gate" />
        <QuickLink title="Housekeeping" href="/housekeeping" />
        <QuickLink title="Maintenance" href="/maintenance" />
        <QuickLink title="Inspections" href="/housekeeping/inspections" />
        <QuickLink title="Exports" href="/reports/exports" />
      </section>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-2xl font-semibold text-neutral-950">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </div>
    </div>
  );
}

function QuickLink({ title, href }: { title: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-neutral-200 bg-white p-5 text-sm font-semibold text-neutral-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {title}
    </Link>
  );
}
