import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import {
  formatAllocationDateTime,
  formatAllocationLabel,
  getAllocationDetail,
} from "@/lib/queries/allocations/allocations";

type AllocationDetailPageProps = {
  params: Promise<{
    allocationId: string;
  }>;
};

function allocationStatusClass(status: string): string {
  switch (status) {
    case "active":
      return "status-active";

    case "checked_in":
      return "status-checked-in";

    case "cancelled":
      return "status-cancelled";

    case "expired":
      return "status-expired";

    default:
      return "status-muted";
  }
}

function roomStatusClass(status: string): string {
  switch (status) {
    case "vacant_ready":
      return "status-vacant-ready";

    case "reserved":
      return "status-reserved";

    case "pending_check_in":
      return "status-pending-check-in";

    case "occupied":
      return "status-occupied";

    case "out_of_service":
    case "manager_hold":
      return "status-blocked";

    default:
      return "status-muted";
  }
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>

      <div className="mt-1 text-sm font-semibold leading-6 text-foreground">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-muted">{label}</span>

      <span className="max-w-[65%] text-right text-sm font-semibold leading-6 text-foreground">
        {value}
      </span>
    </div>
  );
}

export default async function AllocationDetailPage({
  params,
}: AllocationDetailPageProps): Promise<React.JSX.Element> {
  await requireAnyPermission(["allocations.view"]);

  const { allocationId } = await params;
  const allocation = await getAllocationDetail(allocationId);

  if (!allocation) {
    notFound();
  }

  return (
    <div className="page-stack">
      <section className="surface-panel p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="page-kicker">Room allocation</div>

            <h1 className="mt-2 truncate text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl">
              {allocation.guest_name}
            </h1>

            <p className="mt-2 text-sm leading-6 text-muted">
              Room {allocation.room_number} · {allocation.building_code} ·{" "}
              {allocation.camp_name}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href={APP_ROUTES.allocations.list} className="btn-secondary">
              Back to allocations
            </Link>

            {allocation.stay_id ? (
              <Link
                href={APP_ROUTES.stays.detail(allocation.stay_id)}
                className="btn-primary"
              >
                Open stay
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailItem label="Allocation status">
          <StatusIndicator
            label={formatAllocationLabel(allocation.status)}
            statusClassName={allocationStatusClass(allocation.status)}
          />
        </DetailItem>

        <DetailItem label="Arrival">
          {formatAllocationDateTime(allocation.expected_arrival_at)}
        </DetailItem>

        <DetailItem label="Departure">
          {formatAllocationDateTime(allocation.expected_departure_at)}
        </DetailItem>

        <DetailItem label="Room status">
          <StatusIndicator
            label={formatAllocationLabel(allocation.room_status)}
            statusClassName={roomStatusClass(allocation.room_status)}
          />
        </DetailItem>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card variant="card">
          <CardHeader>
            <CardTitle>Guest</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="divide-y divide-border">
              <InfoRow label="Name" value={allocation.guest_name} />

              <InfoRow
                label="Organization"
                value={allocation.guest_organization ?? "—"}
              />

              <InfoRow
                label="Category"
                value={formatAllocationLabel(allocation.guest_category)}
              />

              <InfoRow
                label="VIP"
                value={allocation.guest_is_vip ? "Yes" : "No"}
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="card">
          <CardHeader>
            <CardTitle>Room</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="divide-y divide-border">
              <InfoRow label="Room" value={allocation.room_number} />

              <InfoRow
                label="Building"
                value={`${allocation.building_code} · ${allocation.building_name}`}
              />

              <InfoRow
                label="Room type"
                value={formatAllocationLabel(allocation.room_type_name)}
              />

              <InfoRow
                label="Bed type"
                value={formatAllocationLabel(allocation.bed_type)}
              />

              <InfoRow
                label="Current room status"
                value={formatAllocationLabel(allocation.room_status)}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {allocation.allocation_notes ? (
        <Card variant="card">
          <CardHeader>
            <CardTitle>Reception note</CardTitle>
          </CardHeader>

          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
              {allocation.allocation_notes}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
