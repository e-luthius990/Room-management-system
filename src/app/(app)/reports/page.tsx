import Link from "next/link";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getManagerDashboardMetrics } from "@/lib/queries/reports/get-manager-dashboard-metrics";

export default async function ReportsPage(): Promise<React.JSX.Element> {
  await requireAnyPermission([
    "reports.view_dashboard",
    "reports.view_occupancy",
    "reports.view_guests",
    "reports.view_rooms",
    "reports.view_maintenance",
    "reports.view_housekeeping",
    "reports.view_exports",
    "reports.view_audit",
  ]);

  const metrics = await getManagerDashboardMetrics();

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Operational reporting for occupancy, guests, rooms, housekeeping, maintenance, room service, exports, and audit history."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/reports/audit-logs"
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              Audit Logs
            </Link>

            <Link
              href="/reports/exports"
              className="rounded-2xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Exports
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Metric title="Total Rooms" value={metrics.totalRooms} />
        <Metric title="Vacant Ready" value={metrics.vacantReadyRooms} />
        <Metric title="Occupied" value={metrics.occupiedRooms} />
        <Metric title="Cleaning / Inspection" value={metrics.cleaningRooms} />
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
          title="Open Maintenance"
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
        <ReportCard
          title="Occupancy"
          description="Room occupancy posture, vacant-ready rooms, cleaning backlog, and blocked rooms."
          href="/reports/exports?reportType=occupancy"
        />

        <ReportCard
          title="Guests"
          description="Guest records, categories, organization, nationality, and clearance status."
          href="/reports/exports?reportType=guests"
        />

        <ReportCard
          title="Rooms"
          description="Room inventory, room condition, status posture, and operational readiness."
          href="/reports/exports?reportType=rooms"
        />

        <ReportCard
          title="Maintenance"
          description="Maintenance tickets, blocked rooms, repair status, and verification."
          href="/reports/exports?reportType=maintenance"
        />

        <ReportCard
          title="Housekeeping"
          description="Cleaning tasks, turnover stages, and completion activity."
          href="/reports/exports?reportType=housekeeping"
        />

        <ReportCard
          title="Room Service"
          description="In-stay service requests, assignment, and completion activity."
          href="/reports/exports?reportType=room_service"
        />

        <ReportCard
          title="Audit Logs"
          description="Sensitive operational changes, export history, and workflow audit trail."
          href="/reports/audit-logs"
        />
      </section>
    </div>
  );
}

function Metric({
  title,
  value,
}: {
  title: string;
  value: number;
}): React.JSX.Element {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="text-2xl font-semibold text-neutral-950">{value}</div>

      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {title}
      </div>
    </div>
  );
}

function ReportCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-base font-semibold text-neutral-950">{title}</div>

      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
    </Link>
  );
}
