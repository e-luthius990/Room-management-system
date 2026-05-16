import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { PageHeader } from "@/components/layout/page-header";
import { getSecurityReviewList } from "@/lib/queries/security/get-security-review-list";
import {
  ClearanceStatusBadge,
  PresenceBadge,
  RiskLevelBadge,
  VisitTypeBadge,
} from "@/components/security/security-status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

type SecurityReviewPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

type SecurityReviewItem = Awaited<
  ReturnType<typeof getSecurityReviewList>
>[number];

type SummaryTone = "default" | "success" | "warning" | "danger" | "info";

function countSecuritySummary(
  guests: Awaited<ReturnType<typeof getSecurityReviewList>>,
) {
  return {
    total: guests.length,
    inside: guests.filter((guest) => guest.is_currently_inside).length,
    pendingReception: guests.filter((guest) => guest.is_pending_reception)
      .length,
    pending: guests.filter(
      (guest) =>
        !guest.security_clearance_status ||
        guest.security_clearance_status === "pending",
    ).length,
    cleared: guests.filter(
      (guest) => guest.security_clearance_status === "cleared",
    ).length,
    restricted: guests.filter((guest) =>
      ["watchlist", "denied", "suspended"].includes(
        guest.security_clearance_status ?? "",
      ),
    ).length,
  };
}

function formatLabel(value: string | null): string {
  if (!value) return "—";

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(date);
}

function getErrorMessage(error?: string): string | null {
  if (!error) return null;

  const messages: Record<string, string> = {
    invalid_input: "Check the security clearance form and try again.",
    invalid_gate_entry: "Check the gate entry form and try again.",
    invalid_security_event: "Security event was not found or is invalid.",
    guest_not_found: "Guest record was not found.",
    security_event_not_found: "Security event was not found.",
    guest_already_inside:
      "This guest already has an open gate entry and is recorded inside.",
    guest_already_departed: "This guest has already been marked as left.",
    invalid_clearance_status: "Selected clearance status is invalid.",
    invalid_risk_level: "Selected risk level is invalid.",
    invalid_visit_type: "Selected visit type is invalid.",
    security_notes_required:
      "Security notes are required for restricted or high-risk decisions.",
    access_denied: "You do not have access to perform that security action.",
    clearance_update_failed: "Security clearance could not be updated.",
    security_action_failed: "Security action could not be completed.",
  };

  return messages[error] ?? "Security action could not be completed.";
}

function getSuccessMessage(success?: string): string | null {
  if (!success) return null;

  const messages: Record<string, string> = {
    clearance_updated: "Security clearance updated successfully.",
    gate_entry_recorded: "Gate entry recorded successfully.",
    sent_to_reception: "Guest sent to reception successfully.",
    gate_exit_recorded: "Gate exit recorded successfully.",
  };

  return messages[success] ?? null;
}

function getPresenceSortWeight(guest: SecurityReviewItem): number {
  if (guest.is_pending_reception) return 0;
  if (guest.is_currently_inside) return 1;

  if (
    ["watchlist", "denied", "suspended"].includes(
      guest.security_clearance_status ?? "",
    )
  ) {
    return 2;
  }

  if (guest.security_clearance_status === "pending") return 3;

  return 4;
}

function sortSecurityReviewItems(
  guests: Awaited<ReturnType<typeof getSecurityReviewList>>,
): Awaited<ReturnType<typeof getSecurityReviewList>> {
  return [...guests].sort((a, b) => {
    const byPresence = getPresenceSortWeight(a) - getPresenceSortWeight(b);

    if (byPresence !== 0) {
      return byPresence;
    }

    const aDate =
      a.latest_security_event_at ?? a.last_seen_at ?? a.created_at ?? "";
    const bDate =
      b.latest_security_event_at ?? b.last_seen_at ?? b.created_at ?? "";

    return bDate.localeCompare(aDate);
  });
}

function getContextLine(guest: SecurityReviewItem): string {
  const parts = [
    guest.organization_name ?? guest.organization,
    guest.nationality,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "No organization recorded";
}

function getLatestMovementLabel(guest: SecurityReviewItem): string {
  if (guest.latest_exit_at) {
    return `Left ${formatDateTime(guest.latest_exit_at)}`;
  }

  if (guest.latest_sent_to_reception_at) {
    return `Sent to reception ${formatDateTime(
      guest.latest_sent_to_reception_at,
    )}`;
  }

  if (guest.latest_entry_at) {
    return `Entered ${formatDateTime(guest.latest_entry_at)}`;
  }

  return guest.latest_security_event_at
    ? `Reviewed ${formatDateTime(guest.latest_security_event_at)}`
    : "No security event yet";
}

function SummaryCard({
  title,
  value,
  description,
  tone = "default",
}: {
  title: string;
  value: number;
  description?: string;
  tone?: SummaryTone;
}): React.JSX.Element {
  const toneClass: Record<SummaryTone, string> = {
    default: "border-border bg-surface",
    success: "border-success-600/25 bg-success-50",
    warning: "border-warning-700/25 bg-warning-50",
    danger: "border-danger-600/25 bg-danger-50",
    info: "border-info-600/25 bg-info-50",
  };

  return (
    <article className={cn("rounded-2xl border px-4 py-3", toneClass[tone])}>
      <div className="text-2xl font-semibold tracking-[-0.045em] text-foreground">
        {value}
      </div>

      <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {title}
      </div>

      {description ? (
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      ) : null}
    </article>
  );
}

export default async function SecurityReviewPage({
  searchParams,
}: SecurityReviewPageProps): Promise<React.JSX.Element> {
  await requirePermission("security.view_clearance");
  await requirePermission("guests.view");

  const [query, guests] = await Promise.all([
    searchParams,
    getSecurityReviewList(),
  ]);

  const sortedGuests = sortSecurityReviewItems(guests);
  const summary = countSecuritySummary(guests);
  const errorMessage = getErrorMessage(query?.error);
  const successMessage = getSuccessMessage(query?.success);

  return (
    <div className="page-stack">
      <PageHeader
        title="Security review"
        description="Review guest clearance posture, current gate presence, reception handoff, and recent security notes."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={APP_ROUTES.security.gate} className="btn-primary">
              Gate operations
            </Link>

            <Link
              href={APP_ROUTES.security.pendingReception}
              className="btn-secondary"
            >
              Pending reception
            </Link>
          </div>
        }
      />

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success">{successMessage}</div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          title="Total guests"
          value={summary.total}
          description="Visible to security review"
        />

        <SummaryCard
          title="Inside camp"
          value={summary.inside}
          description="Open gate entries"
          tone="success"
        />

        <SummaryCard
          title="Pending reception"
          value={summary.pendingReception}
          description="Sent from security"
          tone="info"
        />

        <SummaryCard
          title="Pending clearance"
          value={summary.pending}
          description="Awaiting decision"
          tone="warning"
        />

        <SummaryCard
          title="Cleared"
          value={summary.cleared}
          description="Approved guests"
          tone="success"
        />

        <SummaryCard
          title="Restricted"
          value={summary.restricted}
          description="Watchlist / denied"
          tone="danger"
        />
      </section>

      <Card variant="card">
        <CardHeader>
          <CardTitle>Guest security register</CardTitle>
          <CardDescription>
            Priority order shows pending reception, people inside, restricted
            records, then the latest reviewed guests.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="table-shell rounded-none border-0 shadow-none">
            <div className="table-scroll">
              <table className="data-table min-w-[1280px]">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Camp</th>
                    <th>Presence</th>
                    <th>Visit</th>
                    <th>Clearance</th>
                    <th>Risk</th>
                    <th>Latest movement</th>
                    <th>Latest note</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {sortedGuests.map((guest) => (
                    <tr key={guest.id}>
                      <td>
                        <div className="font-semibold text-foreground">
                          {guest.full_name}
                        </div>

                        <div className="mt-1 text-xs leading-5 text-muted">
                          {getContextLine(guest)}
                        </div>

                        <div className="mt-2 text-xs text-muted">
                          {formatLabel(guest.guest_category)}
                        </div>
                      </td>

                      <td className="text-muted">{guest.primary_camp_name}</td>

                      <td>
                        <PresenceBadge
                          isInside={guest.is_currently_inside}
                          isPendingReception={guest.is_pending_reception}
                        />
                      </td>

                      <td>
                        <VisitTypeBadge visitType={guest.latest_visit_type} />

                        {guest.latest_purpose ? (
                          <div className="mt-2 max-w-[220px] truncate text-xs text-muted">
                            {guest.latest_purpose}
                          </div>
                        ) : null}
                      </td>

                      <td>
                        <ClearanceStatusBadge
                          status={guest.security_clearance_status}
                        />
                      </td>

                      <td>
                        <RiskLevelBadge riskLevel={guest.latest_risk_level} />
                      </td>

                      <td className="text-muted">
                        <div className="max-w-[220px] text-sm">
                          {getLatestMovementLabel(guest)}
                        </div>

                        {guest.latest_host_name ||
                        guest.latest_host_department ? (
                          <div className="mt-1 max-w-[220px] truncate text-xs text-muted">
                            {[
                              guest.latest_host_name,
                              guest.latest_host_department,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        ) : null}
                      </td>

                      <td className="text-muted">
                        <div className="max-w-[280px] truncate">
                          {guest.latest_security_note ?? "—"}
                        </div>
                      </td>

                      <td className="text-right">
                        <Link
                          href={APP_ROUTES.security.guestProfile(guest.id)}
                          className="btn-secondary btn-sm"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {sortedGuests.length === 0 ? (
                    <tr className="table-empty-row">
                      <td colSpan={9}>No guests found for security review.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
