import Link from "next/link";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { getExpectedArrivals } from "@/lib/queries/expected-arrivals";
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
  { label: "Expected", value: "expected" },
  { label: "Arrived", value: "arrived" },
  { label: "Allocated", value: "allocated" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No-show", value: "no_show" },
  { label: "All", value: "all" },
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

function statusHref(status: ExpectedArrivalStatus, query: string): string {
  const params = new URLSearchParams();

  params.set("status", status);

  if (query.trim().length > 0) {
    params.set("q", query.trim());
  }

  return `${APP_ROUTES.reception.expectedArrivals}?${params.toString()}`;
}

function StatusRail({
  activeStatus,
  query,
}: {
  activeStatus: ExpectedArrivalStatus;
  query: string;
}): React.JSX.Element {
  return (
    <nav
      aria-label="Expected arrival status filters"
      className="flex flex-wrap gap-2 border border-border bg-surface p-2 shadow-xs"
    >
      {STATUS_OPTIONS.map((option) => {
        const active = option.value === activeStatus;

        return (
          <Link
            key={option.value}
            href={statusHref(option.value, query)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center border px-3 text-xs font-bold uppercase tracking-[0.12em] transition",
              active
                ? "border-brand-600/25 bg-brand-50 text-brand-700"
                : "border-border bg-surface-2 text-muted hover:border-border-strong hover:bg-surface hover:text-foreground",
            )}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
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
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Reception arrival queue</div>

            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-[1.65rem]">
              Expected arrivals
            </h1>

            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
              Track guests expected before room allocation. Security and
              reception use this queue to prepare clearance, arrival handling,
              and room assignment.
            </p>
          </div>

          <Link
            href={APP_ROUTES.reception.createExpectedArrival}
            className="btn-primary"
          >
            Create expected arrival
          </Link>
        </div>
      </section>

      <StatusRail activeStatus={status} query={query} />

      <section className="ops-command" aria-label="Expected arrival search">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
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

          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </section>

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
        <section className="border border-border bg-surface shadow-xs">
          <div className="divide-y divide-border">
            {arrivals.map((arrival) => {
              const id = arrival.expected_arrival_id;

              return (
                <Link
                  key={id ?? `${arrival.guest_id}-${arrival.created_at}`}
                  href={
                    id ? APP_ROUTES.reception.expectedArrivalDetail(id) : "#"
                  }
                  aria-disabled={!id}
                  className={cn(
                    "block px-4 py-3 transition hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
                    !id && "pointer-events-none opacity-60",
                  )}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_15rem] xl:items-start">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
                        Guest
                      </div>

                      <div className="mt-1 truncate text-sm font-semibold leading-8 text-foreground">
                        {arrival.guest_name ?? "Unassigned guest"}
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

                      <div className="mt-1 truncate text-sm font-semibold leading-8 text-foreground">
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

                      <div className="mt-1 truncate text-sm font-semibold leading-8 text-foreground">
                        {formatDateTime(arrival.expected_arrival_at)}
                      </div>

                      <div className="mt-1 truncate text-xs leading-5 text-muted">
                        Departure:{" "}
                        {formatDateTime(arrival.expected_departure_at)}
                      </div>

                      {arrival.is_overdue ? (
                        <div className="mt-1">
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

                      <div className="mt-2 flex flex-col items-start gap-1.5 xl:items-end">
                        <StatusIndicator
                          compact
                          label={formatStatus(arrival.status)}
                          statusClassName={getExpectedArrivalStatusClass(
                            arrival.status,
                          )}
                        />

                        {arrival.host_name ? (
                          <span className="max-w-full truncate text-xs font-semibold leading-5 text-muted">
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
          </div>
        </section>
      )}
    </div>
  );
}
