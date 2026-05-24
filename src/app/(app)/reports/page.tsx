import Link from "next/link";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getManagerDashboardMetrics } from "@/lib/queries/reports/get-manager-dashboard-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REPORTS_PAGE_PERMISSIONS = [
  "reports.view_dashboard",
  "reports.view_occupancy",
  "reports.view_guests",
  "reports.view_rooms",
  "reports.view_exports",
  "reports.view_audit",
  "data.export",
  "exports.reports",
] as const;

const REPORTS_PAGE_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.DASHBOARD_DEBUG_TIMING === "true";

function createReportsPageTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!REPORTS_PAGE_TIMING_ENABLED) {
      return;
    }

    console.info(
      `[${scope}] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
    );
  };
}

export default async function ReportsPage(): Promise<React.JSX.Element> {
  const mark = createReportsPageTimer("reports:dashboard");

  const currentUser = await requireAnyPermission([...REPORTS_PAGE_PERMISSIONS]);
  mark("permission checked");

  const metrics = await getManagerDashboardMetrics(currentUser);
  mark("reports metrics loaded");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Operational reporting for occupancy, rooms, guests, current stays, exited guests, exports, and audit history."
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
        <Metric title="Occupied Rooms" value={metrics.occupiedRooms} />
        <Metric title="Reserved Rooms" value={metrics.reservedRooms} />
        <Metric title="Pending Check-in" value={metrics.pendingCheckInRooms} />
        <Metric title="Pending Checkout" value={metrics.pendingCheckoutRooms} />
        <Metric title="Out of Service" value={metrics.outOfServiceRooms} />
        <Metric title="Manager Hold" value={metrics.managerHoldRooms} />
        <Metric title="Active Stays" value={metrics.activeStays} />
        <Metric title="Due Departures" value={metrics.dueDepartures} />
        <Metric title="Inside Camp" value={metrics.guestsInsideCamp} />
        <Metric title="Recent Exits" value={metrics.recentlyExitedGuests} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard
          title="Occupancy"
          description="Camp-level occupancy, availability, reserved rooms, pending checkout, unavailable rooms, and occupancy rate."
          href="/reports/exports?reportType=occupancy"
        />

        <ReportCard
          title="Guests"
          description="Guest records, categories, organization, nationality, contact fields, and security clearance status."
          href="/reports/exports?reportType=guests"
        />

        <ReportCard
          title="Rooms"
          description="Room inventory, room status, condition, capacity, VIP flag, delegate suitability, and active guest assignment."
          href="/reports/exports?reportType=rooms"
        />

        <ReportCard
          title="Current Stays"
          description="Checked-in guests with assigned room, expected departure, stay status, and security presence."
          href="/reports/exports?reportType=current_stays"
        />

        <ReportCard
          title="Exited Guests"
          description="Reception checkouts and security gate exits, including previous room, exit source, and departure time."
          href="/reports/exports?reportType=exited_guests"
        />

        <ReportCard
          title="Audit Logs"
          description="Sensitive operational changes, export activity, and workflow audit trail."
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
      className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
    >
      <div className="text-base font-semibold text-neutral-950">{title}</div>

      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
    </Link>
  );
}
