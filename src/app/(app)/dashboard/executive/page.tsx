import Link from "next/link";
import type { JSX } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const EXECUTIVE_DASHBOARD_PERMISSIONS = [
  "reports.view_dashboard",
  "reports.view_occupancy",
  "reports.view_guests",
  "reports.view_rooms",
  "rooms.view",
  "rooms.view_board",
] as const;

const EXECUTIVE_DASHBOARD_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.DASHBOARD_DEBUG_TIMING === "true";

function createExecutiveDashboardTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!EXECUTIVE_DASHBOARD_TIMING_ENABLED) {
      return;
    }

    console.info(
      `[${scope}] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
    );
  };
}

export default async function ExecutiveDashboardPage(): Promise<JSX.Element> {
  const mark = createExecutiveDashboardTimer("dashboard:executive");

  await requireAnyPermission([...EXECUTIVE_DASHBOARD_PERMISSIONS]);
  mark("permission checked");

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Executive dashboard"
        title="Read-only operational visibility"
        description="Review high-level occupancy, guest movement, room utilization, current stays, departures, and camp-level operational status without edit access."
        actions={
          <Link href={APP_ROUTES.reports.home} className="btn-primary">
            View reports
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardLink
          title="Occupancy"
          description="Review room occupancy, available capacity, reserved rooms, pending check-ins, and pending checkouts."
          href={APP_ROUTES.reports.occupancy}
        />

        <DashboardLink
          title="Rooms"
          description="View room availability, occupied rooms, reserved rooms, out-of-service rooms, and manager-held rooms."
          href={APP_ROUTES.rooms.board}
        />

        <DashboardLink
          title="Guests"
          description="Review guest records, categories, organizations, clearance posture, and operational guest visibility."
          href={APP_ROUTES.reports.guests}
        />

        <DashboardLink
          title="Current stays"
          description="View checked-in guests, assigned rooms, expected departures, and current stay status."
          href="/reports/exports?reportType=current_stays"
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
}): JSX.Element {
  return (
    <Link
      href={href}
      className="group block border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2 hover:shadow-command"
    >
      <div className="text-sm font-semibold text-foreground">{title}</div>

      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>

      <div className="mt-4 text-sm font-semibold text-foreground group-hover:underline">
        Open area
      </div>
    </Link>
  );
}
