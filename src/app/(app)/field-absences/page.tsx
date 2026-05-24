import Link from "next/link";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { getFieldAbsences } from "@/lib/queries/field-absences";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";

type FieldAbsencesPageSearchParams = {
  q?: string | string[];
  status?: string | string[];
};

type FieldAbsencesPageProps = {
  searchParams?: Promise<FieldAbsencesPageSearchParams>;
};

type FieldAbsenceStatus =
  | "all"
  | "active"
  | "away"
  | "extended"
  | "returned"
  | "cancelled";

const STATUS_OPTIONS: { label: string; value: FieldAbsenceStatus }[] = [
  { label: "Active", value: "active" },
  { label: "Away", value: "away" },
  { label: "Extended", value: "extended" },
  { label: "Returned", value: "returned" },
  { label: "Cancelled", value: "cancelled" },
  { label: "All", value: "all" },
];

function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeStatus(value: string | undefined): FieldAbsenceStatus {
  if (
    value === "all" ||
    value === "active" ||
    value === "away" ||
    value === "extended" ||
    value === "returned" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "active";
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

function getFieldAbsenceStatusClass(status: string | null): string {
  switch (status) {
    case "away":
      return "status-reserved";

    case "extended":
      return "status-overdue";

    case "returned":
      return "status-vacant-ready";

    case "cancelled":
      return "status-muted";

    default:
      return "status-muted";
  }
}

function statusHref(status: FieldAbsenceStatus, query: string): string {
  const params = new URLSearchParams();

  params.set("status", status);

  if (query.trim().length > 0) {
    params.set("q", query.trim());
  }

  return `/field-absences?${params.toString()}`;
}

function SummaryCell({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone?: "success" | "warning" | "danger" | "info";
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "ops-live-card min-h-[4.35rem] px-3 py-2.5",
        tone === "success" && "ops-live-card-success",
        tone === "warning" && "ops-live-card-warning",
        tone === "danger" && "ops-live-card-danger",
        tone === "info" && "ops-live-card-info",
      )}
    >
      <div className="ops-live-label">{label}</div>

      <div className="mt-0.5 text-xl font-semibold leading-6 tracking-[-0.045em] text-foreground">
        {value}
      </div>

      <div className="mt-0.5 truncate text-[11px] leading-4 text-muted">
        {note}
      </div>
    </div>
  );
}

function StatusRail({
  activeStatus,
  query,
}: {
  activeStatus: FieldAbsenceStatus;
  query: string;
}): React.JSX.Element {
  return (
    <nav
      aria-label="Field absence status filters"
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

export default async function FieldAbsencesPage({
  searchParams,
}: FieldAbsencesPageProps): Promise<React.JSX.Element> {
  await requirePermission("field_absences.view");

  const params = searchParams ? await searchParams : undefined;
  const query = singleParam(params?.q)?.trim() ?? "";
  const status = normalizeStatus(singleParam(params?.status));

  const absences = await getFieldAbsences({
    query,
    status,
  });

  const total = absences.length;
  const activeCount = absences.filter(
    (absence) => absence.status === "away" || absence.status === "extended",
  ).length;
  const overdueCount = absences.filter((absence) => absence.is_overdue).length;
  const returnedCount = absences.filter(
    (absence) => absence.status === "returned",
  ).length;

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="min-w-0">
            <div className="page-kicker">Field movement register</div>

            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-[1.65rem]">
              Field absences
            </h1>

            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted">
              Track occupants temporarily away in the field while their rooms
              remain occupied and visible to reception.
            </p>
          </div>

          <Link href={APP_ROUTES.stays.list} className="btn-secondary">
            Back to stays
          </Link>
        </div>
      </section>

      <section
        aria-label="Field absence summary"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
      >
        <SummaryCell label="Total" value={total} note="Matching records" />
        <SummaryCell
          label="Active"
          value={activeCount}
          note="Away or extended"
          tone="warning"
        />
        <SummaryCell
          label="Overdue"
          value={overdueCount}
          note="Expected return passed"
          tone="danger"
        />
        <SummaryCell
          label="Returned"
          value={returnedCount}
          note="Closed field movements"
          tone="success"
        />
      </section>

      <StatusRail activeStatus={status} query={query} />

      <section className="ops-command" aria-label="Field absence search">
        <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <Input
            name="q"
            defaultValue={query}
            label="Search"
            placeholder="Search guest, room, destination, reason..."
            wrapperClassName="min-w-0"
          />

          <input type="hidden" name="status" value={status} />

          <Button type="submit" variant="secondary">
            Filter
          </Button>
        </form>
      </section>

      {absences.length === 0 ? (
        <EmptyState
          operational
          align="left"
          size="sm"
          title="No field absences found"
          description="Field absences will appear here when an active occupant is marked away in the field."
        />
      ) : (
        <section className="border border-border bg-surface shadow-xs">
          <div className="divide-y divide-border">
            {absences.map((absence) => {
              const id = absence.field_absence_id;

              return (
                <Link
                  key={id ?? `${absence.stay_id}-${absence.created_at}`}
                  href={id ? APP_ROUTES.fieldAbsences.detail(id) : "#"}
                  aria-disabled={!id}
                  className={cn(
                    "block px-4 py-3 transition hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
                    !id && "pointer-events-none opacity-60",
                  )}
                >
                  <div className="grid gap-4 xl:grid-cols-[8.5rem_minmax(0,1.1fr)_minmax(0,0.9fr)_15rem] xl:items-start">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
                        Room
                      </div>

                      <div className="mt-1 text-3xl font-semibold leading-8 tracking-[-0.06em] text-foreground">
                        {absence.room_number ?? "—"}
                      </div>

                      <div className="mt-1 truncate text-xs leading-5 text-muted">
                        {absence.camp_name ?? "Unknown camp"}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
                        Guest
                      </div>

                      <div className="mt-1 truncate text-sm font-semibold leading-8 text-foreground">
                        {absence.guest_name ?? "Unknown guest"}
                      </div>

                      <div className="mt-1 truncate text-xs leading-5 text-muted">
                        {absence.guest_phone ??
                          absence.guest_email ??
                          absence.guest_organization ??
                          "No contact details"}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
                        Field window
                      </div>

                      <div className="mt-1 truncate text-sm font-semibold leading-8 text-foreground">
                        Return: {formatDateTime(absence.expected_return_at)}
                      </div>

                      <div className="mt-1 truncate text-xs leading-5 text-muted">
                        Departure: {formatDateTime(absence.departure_at)}
                      </div>

                      <div className="mt-1 truncate text-xs leading-5 text-muted">
                        Days away: {absence.days_away ?? 0}
                      </div>
                    </div>

                    <div className="min-w-0 xl:text-right">
                      <div className="text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-muted">
                        Status
                      </div>

                      <div className="mt-2 flex flex-col items-start gap-1.5 xl:items-end">
                        <StatusIndicator
                          compact
                          label={formatStatus(absence.status)}
                          statusClassName={getFieldAbsenceStatusClass(
                            absence.status,
                          )}
                        />

                        {absence.is_overdue ? (
                          <StatusIndicator
                            compact
                            statusClassName="status-overdue"
                            label="Overdue"
                          />
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
