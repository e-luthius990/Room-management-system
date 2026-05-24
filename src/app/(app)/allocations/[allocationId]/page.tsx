import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
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
      return "status-under-maintenance";

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
    <div className="metadata-item">
      <div className="metadata-label">{label}</div>

      <div className="metadata-value">{children}</div>
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
    <div className="grid gap-2 border-b border-border py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)]">
      <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>

      <div className="min-w-0 text-sm font-semibold leading-6 text-foreground">
        {value}
      </div>
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
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  Room
                </div>

                <h1 className="mt-1 text-4xl font-semibold leading-none tracking-[-0.065em] text-foreground sm:text-5xl">
                  {allocation.room_number}
                </h1>
              </div>

              <div className="min-w-0 pb-1">
                <div className="truncate text-lg font-semibold tracking-[-0.03em] text-foreground">
                  {allocation.guest_name}
                </div>

                <p className="mt-1 text-sm leading-6 text-muted">
                  {allocation.building_code} · {allocation.camp_name}
                </p>
              </div>
            </div>
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
                Check In
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="min-w-0 space-y-4">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DetailItem label="Allocation status">
              <StatusIndicator
                compact
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
                compact
                label={formatAllocationLabel(allocation.room_status)}
                statusClassName={roomStatusClass(allocation.room_status)}
              />
            </DetailItem>
          </section>

          <Card variant="console">
            <CardHeader dense>
              <CardTitle className="text-sm">Guest information</CardTitle>
              <CardDescription className="text-xs leading-5">
                Guest identity and classification attached to this allocation.
              </CardDescription>
            </CardHeader>

            <CardContent dense>
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

          <Card variant="console">
            <CardHeader dense>
              <CardTitle className="text-sm">Room information</CardTitle>
              <CardDescription className="text-xs leading-5">
                Room, building, bed, and current operational room status.
              </CardDescription>
            </CardHeader>

            <CardContent dense>
              <div className="divide-y divide-border">
                <InfoRow
                  label="Room"
                  value={
                    <span className="text-lg font-semibold tracking-[-0.04em]">
                      {allocation.room_number}
                    </span>
                  }
                />

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
                  label="Current status"
                  value={
                    <StatusIndicator
                      compact
                      label={formatAllocationLabel(allocation.room_status)}
                      statusClassName={roomStatusClass(allocation.room_status)}
                    />
                  }
                />
              </div>
            </CardContent>
          </Card>

          {allocation.allocation_notes ? (
            <Card variant="console">
              <CardHeader dense>
                <CardTitle className="text-sm">Reception note</CardTitle>
                <CardDescription className="text-xs leading-5">
                  Internal allocation note captured by reception.
                </CardDescription>
              </CardHeader>

              <CardContent dense>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
                  {allocation.allocation_notes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </main>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card variant="inspector">
            <CardHeader dense>
              <CardTitle className="text-sm">Operational summary</CardTitle>
              <CardDescription className="text-xs leading-5">
                Current allocation state and linked workflow.
              </CardDescription>
            </CardHeader>

            <CardContent dense className="space-y-4">
              <div className="metadata-item">
                <div className="metadata-label">Room</div>
                <div className="metadata-value text-2xl leading-8">
                  {allocation.room_number}
                </div>
                <div className="mt-1 truncate text-xs text-muted">
                  {allocation.building_code} · {allocation.camp_name}
                </div>
              </div>

              <div className="metadata-item">
                <div className="metadata-label">Guest</div>
                <div className="metadata-value">{allocation.guest_name}</div>
                <div className="mt-1 truncate text-xs text-muted">
                  {allocation.guest_organization ?? "No organization"}
                </div>
              </div>

              <div className="grid gap-2">
                <StatusIndicator
                  compact
                  label={formatAllocationLabel(allocation.status)}
                  statusClassName={allocationStatusClass(allocation.status)}
                />

                <StatusIndicator
                  compact
                  label={formatAllocationLabel(allocation.room_status)}
                  statusClassName={roomStatusClass(allocation.room_status)}
                />
              </div>

              <div className="grid gap-2 border-t border-border pt-4">
                {allocation.stay_id ? (
                  <Link
                    href={APP_ROUTES.stays.detail(allocation.stay_id)}
                    className="btn-primary w-full"
                  >
                    Check In
                  </Link>
                ) : null}

                <Link
                  href={APP_ROUTES.allocations.list}
                  className="btn-secondary w-full"
                >
                  Back to allocations
                </Link>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
}
