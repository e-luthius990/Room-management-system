import Link from "next/link";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { getExpectedArrivals } from "@/lib/queries/expected-arrivals";
import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";

type ExpectedArrivalsPageSearchParams = {
  q?: string | string[];
  status?: string | string[];
};

type ExpectedArrivalsPageProps = {
  searchParams?: Promise<ExpectedArrivalsPageSearchParams>;
};

type ExpectedArrivalStatus =
  | "all"
  | "expected"
  | "arrived"
  | "allocated"
  | "cancelled"
  | "no_show";

const STATUS_OPTIONS: { label: string; value: ExpectedArrivalStatus }[] = [
  { label: "All", value: "all" },
  { label: "Expected", value: "expected" },
  { label: "Arrived", value: "arrived" },
  { label: "Allocated", value: "allocated" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No-show", value: "no_show" },
];

function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeStatus(value: string | undefined): ExpectedArrivalStatus {
  if (
    value === "expected" ||
    value === "arrived" ||
    value === "allocated" ||
    value === "cancelled" ||
    value === "no_show" ||
    value === "all"
  ) {
    return value;
  }

  return "all";
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function formatStatus(status: string | null): string {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getExpectedArrivalStatusClass(status: string | null): string {
  switch (status) {
    case "expected":
      return "status-reserved";

    case "arrived":
      return "status-occupied";

    case "allocated":
      return "status-vacant-ready";

    case "cancelled":
    case "no_show":
      return "status-muted";

    default:
      return "status-muted";
  }
}

export default async function ExpectedArrivalsPage({
  searchParams,
}: ExpectedArrivalsPageProps): Promise<React.JSX.Element> {
  await requirePermission("expected_arrivals.view");

  const params = searchParams ? await searchParams : undefined;
  const query = singleParam(params?.q)?.trim() ?? "";
  const status = normalizeStatus(singleParam(params?.status));

  const arrivals = await getExpectedArrivals({
    query,
    status,
  });

  return (
    <div className="space-y-3">
      <section
        className="border border-info-600/25 bg-info-50 px-3 py-3 shadow-xs"
        aria-label="Expected arrival filters"
      >
        <form method="get">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
            <Input
              name="q"
              defaultValue={query}
              label="Search"
              placeholder="Search guest, phone, host, organization..."
              wrapperClassName="min-w-0"
            />

            <Select
              name="status"
              defaultValue={status}
              label="Status"
              options={STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />

            <Button type="submit" variant="primary" className="h-10 px-5">
              Filter
            </Button>
          </div>
        </form>
      </section>

      <div className="flex justify-end">
        <Link
          href={APP_ROUTES.reception.createExpectedArrival}
          className="btn-primary h-10 px-4"
        >
          Create expected arrival
        </Link>
      </div>

      {arrivals.length === 0 ? (
        <EmptyState
          operational
          align="left"
          size="sm"
          title="No expected arrivals found"
          description="Create an expected arrival when a guest is expected but no room has been allocated yet."
          action={
            <Link
              href={APP_ROUTES.reception.createExpectedArrival}
              className="btn-primary"
            >
              Create expected arrival
            </Link>
          }
        />
      ) : (
        <section className="grid gap-3" aria-label="Expected arrival records">
          {arrivals.map((arrival) => {
            const id = arrival.expected_arrival_id;

            return (
              <Link
                key={id ?? `${arrival.guest_id}-${arrival.created_at}`}
                href={id ? APP_ROUTES.reception.expectedArrivalDetail(id) : "#"}
                aria-disabled={!id}
                className={cn(
                  "block border border-border bg-surface px-4 py-3 shadow-xs transition hover:border-border-strong hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
                  !id && "pointer-events-none opacity-60",
                )}
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.75fr)_minmax(0,0.95fr)_13rem] xl:items-start">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
                      Guest
                    </div>

                    <div className="mt-1">
                      <GuestNameWithPhoto
                        guestId={arrival.guest_id ?? ""}
                        name={arrival.guest_name ?? "Unassigned guest"}
                      />
                    </div>

                    <div className="mt-1 truncate text-xs leading-5 text-muted">
                      {arrival.guest_phone ??
                        arrival.guest_email ??
                        arrival.guest_organization ??
                        "No contact details"}
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
                      Camp
                    </div>

                    <div className="mt-1 truncate text-sm font-semibold leading-6 text-foreground">
                      {arrival.camp_name ?? "Unknown camp"}
                    </div>

                    <div className="mt-1 truncate text-xs leading-5 text-muted">
                      Expected arrival record
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
                      Arrival window
                    </div>

                    <div className="mt-1 truncate text-sm font-semibold leading-6 text-foreground">
                      {formatDateTime(arrival.expected_arrival_at)}
                    </div>

                    <div className="mt-1 truncate text-xs leading-5 text-muted">
                      Departure: {formatDateTime(arrival.expected_departure_at)}
                    </div>

                    {arrival.is_overdue ? (
                      <div className="mt-1.5">
                        <StatusIndicator
                          compact
                          statusClassName="status-overdue"
                          label="Overdue"
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 xl:text-right">
                    <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
                      Status
                    </div>

                    <div className="mt-1.5 flex flex-col items-start gap-1.5 xl:items-end">
                      <StatusIndicator
                        compact
                        label={formatStatus(arrival.status)}
                        statusClassName={getExpectedArrivalStatusClass(
                          arrival.status,
                        )}
                      />

                      {arrival.host_name ? (
                        <span
                          className="max-w-full truncate text-xs font-semibold leading-5 text-muted"
                          title={arrival.host_name}
                        >
                          {arrival.host_name}
                        </span>
                      ) : null}

                      {id ? (
                        <span className="inline-flex min-h-7 items-center border border-border bg-surface px-2.5 text-[11px] font-bold text-muted">
                          Open
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
