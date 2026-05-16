import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { getReservations } from "@/lib/queries/reservations/get-reservations";

type Reservation = Awaited<ReturnType<typeof getReservations>>[number];

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatReservationStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    no_show: "No Show",
    checked_in: "Checked In",
    expired: "Expired",
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

function getReservationStatusClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "status-vacant-ready";

    case "pending":
      return "status-reserved";

    case "checked_in":
      return "status-occupied";

    case "cancelled":
    case "no_show":
      return "status-under-maintenance";

    case "expired":
      return "status-muted";

    default:
      return "status-muted";
  }
}

const reservationColumns: DataTableColumn<Reservation>[] = [
  {
    id: "guest",
    header: "Guest",
    cell: (reservation) => (
      <div className="min-w-0">
        <div className="font-semibold text-foreground">
          {reservation.guest_name ?? "Guest not assigned"}
        </div>

        {reservation.group_id ? (
          <div className="mt-1 text-xs text-muted">Group reservation</div>
        ) : null}
      </div>
    ),
  },
  {
    id: "room",
    header: "Room",
    cell: (reservation) => (
      <div className="min-w-0">
        <div className="font-semibold text-foreground">
          Room {reservation.room_number ?? "—"}
        </div>

        <div className="mt-1 text-xs text-muted">
          {reservation.building_name ?? "No building"}
        </div>
      </div>
    ),
  },
  {
    id: "camp",
    header: "Camp",
    cell: (reservation) => (
      <span className="text-muted">{reservation.camp_name ?? "—"}</span>
    ),
  },
  {
    id: "expected",
    header: "Expected",
    cell: (reservation) => (
      <div>
        <div className="font-medium text-foreground">
          Arrival: {formatDateTime(reservation.expected_arrival_at)}
        </div>

        <div className="mt-1 text-xs text-muted">
          Departure: {formatDateTime(reservation.expected_departure_at)}
        </div>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (reservation) => (
      <StatusIndicator
        label={formatReservationStatus(reservation.status)}
        statusClassName={getReservationStatusClass(reservation.status)}
      />
    ),
  },
  {
    id: "flags",
    header: "Flags",
    cell: (reservation) =>
      reservation.is_vip_hold ? (
        <span className="rounded-full border border-warning-700/25 bg-warning-50 px-2.5 py-1 text-xs font-semibold text-warning-700">
          VIP hold
        </span>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
  {
    id: "actions",
    header: "",
    align: "right",
    cell: (reservation) => (
      <Link
        href={`/reservations/${reservation.id}`}
        className="btn-secondary btn-sm"
      >
        Open
      </Link>
    ),
  },
];

export default async function ReservationsPage(): Promise<React.JSX.Element> {
  await requirePermission("reservations.view");

  const reservations = await getReservations();

  return (
    <div className="page-stack">
      <PageHeader
        title="Reservations"
        description="Pre-allocate rooms, manage upcoming arrivals, and monitor confirmed holds."
        actions={
          <Link href="/reservations/new" className="btn-primary">
            New reservation
          </Link>
        }
      />

      <DataTable
        data={reservations}
        columns={reservationColumns}
        getRowKey={(reservation) => reservation.id}
        emptyTitle="No reservations found"
        emptyDescription="Reservations will appear here once they are created."
      />
    </div>
  );
}
