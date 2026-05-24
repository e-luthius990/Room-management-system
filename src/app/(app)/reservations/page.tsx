import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { getReservations } from "@/lib/queries/reservations/get-reservations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Reservation = Awaited<ReturnType<typeof getReservations>>[number];

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatReservationStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    no_show: "No show",
    checked_in: "Checked in",
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
    case "expired":
      return "status-muted";

    default:
      return "status-muted";
  }
}

function countByStatus(reservations: Reservation[], status: string): number {
  return reservations.filter((reservation) => reservation.status === status)
    .length;
}

function getNextExpectedArrival(reservations: Reservation[]): string {
  const now = Date.now();

  const nextReservation = reservations
    .filter((reservation) => {
      if (
        reservation.status !== "pending" &&
        reservation.status !== "confirmed"
      ) {
        return false;
      }

      if (!reservation.expected_arrival_at) {
        return false;
      }

      const arrivalTime = new Date(reservation.expected_arrival_at).getTime();

      return Number.isFinite(arrivalTime) && arrivalTime >= now;
    })
    .sort(
      (first, second) =>
        new Date(first.expected_arrival_at ?? 0).getTime() -
        new Date(second.expected_arrival_at ?? 0).getTime(),
    )[0];

  return formatDateTime(nextReservation?.expected_arrival_at ?? null);
}

function ReservationPressureStrip({
  reservations,
}: {
  reservations: Reservation[];
}): React.JSX.Element {
  const pendingCount = countByStatus(reservations, "pending");
  const confirmedCount = countByStatus(reservations, "confirmed");
  const checkedInCount = countByStatus(reservations, "checked_in");
  const vipHoldCount = reservations.filter(
    (reservation) => reservation.is_vip_hold,
  ).length;

  const items = [
    {
      label: "Total",
      value: reservations.length,
      note: "Reservations",
    },
    {
      label: "Pending",
      value: pendingCount,
      note: "Needs confirmation",
    },
    {
      label: "Confirmed",
      value: confirmedCount,
      note: "Room holds",
    },
    {
      label: "Checked in",
      value: checkedInCount,
      note: "Converted",
    },
    {
      label: "VIP holds",
      value: vipHoldCount,
      note: "Priority holds",
    },
  ];

  return (
    <section
      aria-label="Reservation operations summary"
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
    >
      {items.map((item) => (
        <article
          key={item.label}
          className="border border-border bg-surface px-3 py-2.5 shadow-xs"
        >
          <div className="truncate text-[10px] font-bold uppercase leading-3 tracking-[0.13em] text-muted">
            {item.label}
          </div>

          <div className="mt-0.5 text-xl font-semibold leading-6 tracking-[-0.045em] text-foreground">
            {item.value}
          </div>

          <div className="mt-0.5 truncate text-[11px] leading-4 text-muted">
            {item.note}
          </div>
        </article>
      ))}
    </section>
  );
}

const reservationColumns: DataTableColumn<Reservation>[] = [
  {
    id: "arrival",
    header: "Arrival",
    cell: (reservation) => (
      <div className="min-w-[210px]">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Expected
        </div>

        <div className="mt-1 text-sm font-semibold leading-6 text-foreground">
          {formatDateTime(reservation.expected_arrival_at)}
        </div>

        <div className="mt-1 text-xs leading-5 text-muted">
          Until {formatDateTime(reservation.expected_departure_at)}
        </div>
      </div>
    ),
  },
  {
    id: "guest",
    header: "Guest",
    cell: (reservation) => (
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">
          {reservation.guest_name ?? "Guest not assigned"}
        </div>

        <div className="mt-1 truncate text-xs leading-5 text-muted">
          {reservation.group_id ? "Group reservation" : "Individual hold"}
        </div>
      </div>
    ),
  },
  {
    id: "room",
    header: "Room",
    cell: (reservation) => (
      <div className="min-w-[8rem]">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Room
        </div>

        <div className="mt-1 text-2xl font-semibold leading-7 tracking-[-0.055em] text-foreground">
          {reservation.room_number ?? "—"}
        </div>

        <div className="mt-1 truncate text-xs leading-5 text-muted">
          {reservation.building_name ?? "No building"}
        </div>
      </div>
    ),
  },
  {
    id: "camp",
    header: "Camp",
    cell: (reservation) => (
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">
          {reservation.camp_name ?? "—"}
        </div>

        <div className="mt-1 text-xs leading-5 text-muted">
          Reservation scope
        </div>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (reservation) => (
      <div className="flex flex-col items-start gap-1.5">
        <StatusIndicator
          compact
          label={formatReservationStatus(reservation.status)}
          statusClassName={getReservationStatusClass(reservation.status)}
        />

        {reservation.is_vip_hold ? (
          <StatusIndicator
            compact
            withDot={false}
            statusClassName="status-reserved"
            label="VIP hold"
          />
        ) : null}
      </div>
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
  noStore();

  await requirePermission("reservations.view");

  const reservations = await getReservations();
  const nextArrival = getNextExpectedArrival(reservations);

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Reception reservation register</div>

            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-[1.65rem]">
              Reservations
            </h1>

            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
              Track planned arrivals before they become active stays. This queue
              controls room blocking, reception readiness, and delegate holds.
            </p>

            <div className="mt-3 inline-flex border border-border bg-surface px-3 py-2 text-xs font-semibold text-muted">
              Next arrival:{" "}
              <span className="ml-1 text-foreground">{nextArrival}</span>
            </div>
          </div>

          <Link href="/reservations/new" className="btn-primary">
            New reservation
          </Link>
        </div>
      </section>

      <ReservationPressureStrip reservations={reservations} />

      <DataTable
        data={reservations}
        columns={reservationColumns}
        getRowKey={(reservation) => reservation.id}
        emptyTitle="No reservations found"
        emptyDescription="Reservations will appear here after reception or management creates planned room holds."
      />
    </div>
  );
}
