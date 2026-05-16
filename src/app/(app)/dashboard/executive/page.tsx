import Link from "next/link";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { PageHeader } from "@/components/layout/page-header";

export default async function ExecutiveDashboardPage() {
  await requireAnyPermission([
    "reports.view_occupancy",
    "reports.view_guests",
    "reports.view_rooms",
    "reports.view_maintenance",
    "reports.view_housekeeping",
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Executive dashboard"
        title="Read-only operational visibility"
        description="Review high-level occupancy, guest movement, room utilization, maintenance pressure, and housekeeping readiness without operational edit access."
        actions={
          <Link href={APP_ROUTES.reports.home} className="btn-primary">
            View reports
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardLink
          title="Occupancy"
          description="Review occupancy trends, current capacity use, and utilization visibility."
          href={APP_ROUTES.reports.occupancy}
        />
        <DashboardLink
          title="Rooms"
          description="View room status, readiness, and operational health."
          href={APP_ROUTES.rooms.board}
        />
        <DashboardLink
          title="Maintenance"
          description="Review maintenance load and unresolved operational blockers."
          href={APP_ROUTES.reports.maintenance}
        />
        <DashboardLink
          title="Housekeeping"
          description="Review housekeeping readiness, inspection progress, and cleaning activity."
          href={APP_ROUTES.reports.housekeeping}
        />
      </section>
    </div>
  );
}

function DashboardLink({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
    >
      <div className="text-sm font-semibold text-neutral-950">{title}</div>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
      <div className="mt-4 text-sm font-semibold text-neutral-950 group-hover:underline">
        Open area
      </div>
    </Link>
  );
}
