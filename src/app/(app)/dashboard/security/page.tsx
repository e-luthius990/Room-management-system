import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { PageHeader } from "@/components/layout/page-header";
import { getSecurityReviewList } from "@/lib/queries/security/get-security-review-list";
import { getGateDashboard } from "@/lib/queries/security/get-gate-dashboard";
import { SecurityPresenceCard } from "@/components/security/security-presence-card";
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
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

type PageSearchParams = {
  error?: string | string[];
  success?: string | string[];
};

type SecurityDashboardPageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

type SecurityReviewItem = Awaited<
  ReturnType<typeof getSecurityReviewList>
>[number];

type GateDashboard = Awaited<ReturnType<typeof getGateDashboard>>;
type GatePresenceItem = GateDashboard["peopleInside"][number];

type SummaryTone = "default" | "success" | "warning" | "danger" | "info";

const SECURITY_ROUTES = {
  gate: "/security/gate",
  pendingReception: "/security/pending-reception",
  guestProfile: (guestId: string) => `/security/guests/${guestId}`,
} as const;

function getFirstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

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

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRestricted(status: string | null | undefined): boolean {
  return ["watchlist", "denied", "suspended"].includes(status ?? "");
}

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

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
  if (!success) {
    return null;
  }

  const messages: Record<string, string> = {
    clearance_updated: "Security clearance updated successfully.",
    gate_entry_recorded: "Gate entry recorded successfully.",
    sent_to_reception: "Guest sent to reception successfully.",
    gate_exit_recorded: "Gate exit recorded successfully.",
  };

  return messages[success] ?? null;
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

  if (guest.latest_security_event_at) {
    return `Reviewed ${formatDateTime(guest.latest_security_event_at)}`;
  }

  return "No security activity";
}

function getGuestContext(guest: SecurityReviewItem): string {
  const parts = [
    guest.organization_name ?? guest.organization,
    guest.nationality,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "No organization recorded";
}

function getReviewPriority(guest: SecurityReviewItem): number {
  if (guest.is_pending_reception) {
    return 0;
  }

  if (isRestricted(guest.security_clearance_status)) {
    return 1;
  }

  if (guest.is_currently_inside) {
    return 2;
  }

  if (
    !guest.security_clearance_status ||
    guest.security_clearance_status === "pending"
  ) {
    return 3;
  }

  return 4;
}

function getRecentSecurityItems(
  guests: SecurityReviewItem[],
): SecurityReviewItem[] {
  return [...guests]
    .sort((a, b) => {
      const byPriority = getReviewPriority(a) - getReviewPriority(b);

      if (byPriority !== 0) {
        return byPriority;
      }

      const aDate =
        a.latest_security_event_at ?? a.last_seen_at ?? a.created_at ?? "";
      const bDate =
        b.latest_security_event_at ?? b.last_seen_at ?? b.created_at ?? "";

      return bDate.localeCompare(aDate);
    })
    .slice(0, 8);
}

function getHighAttentionItems(
  guests: SecurityReviewItem[],
): SecurityReviewItem[] {
  return guests
    .filter(
      (guest) =>
        guest.is_pending_reception ||
        isRestricted(guest.security_clearance_status) ||
        guest.latest_risk_level === "high" ||
        guest.latest_risk_level === "critical",
    )
    .sort((a, b) => {
      const byPriority = getReviewPriority(a) - getReviewPriority(b);

      if (byPriority !== 0) {
        return byPriority;
      }

      const aDate =
        a.latest_security_event_at ?? a.last_seen_at ?? a.created_at ?? "";
      const bDate =
        b.latest_security_event_at ?? b.last_seen_at ?? b.created_at ?? "";

      return bDate.localeCompare(aDate);
    })
    .slice(0, 6);
}

function getLatestInsideItems(
  peopleInside: GatePresenceItem[],
): GatePresenceItem[] {
  return [...peopleInside]
    .sort((a, b) => {
      const aDate = a.entry_at ?? "";
      const bDate = b.entry_at ?? "";

      return bDate.localeCompare(aDate);
    })
    .slice(0, 4);
}

function SummaryCard({
  title,
  value,
  description,
  tone = "default",
}: {
  title: string;
  value: number;
  description: string;
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

      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
    </article>
  );
}

function AlertPanel({
  guests,
}: {
  guests: SecurityReviewItem[];
}): React.JSX.Element {
  if (guests.length === 0) {
    return (
      <EmptyState
        size="sm"
        title="No high-attention security items"
        description="Restricted, high-risk, and pending-reception records will appear here when they need action."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {guests.map((guest) => (
        <Link
          key={guest.id}
          href={SECURITY_ROUTES.guestProfile(guest.id)}
          className="rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:bg-surface-2 hover:shadow-soft"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <PresenceBadge
                  isInside={guest.is_currently_inside}
                  isPendingReception={guest.is_pending_reception}
                />

                <ClearanceStatusBadge
                  status={guest.security_clearance_status}
                />

                <RiskLevelBadge riskLevel={guest.latest_risk_level} />
              </div>

              <div className="mt-3 truncate text-sm font-semibold text-foreground">
                {guest.full_name}
              </div>

              <div className="mt-1 text-xs leading-5 text-muted">
                {getGuestContext(guest)}
              </div>
            </div>

            <div className="text-left text-xs leading-5 text-muted md:max-w-[260px] md:text-right">
              {getLatestMovementLabel(guest)}
            </div>
          </div>

          {guest.latest_security_note ? (
            <div className="mt-3 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-xs leading-5 text-muted">
              {guest.latest_security_note}
            </div>
          ) : null}
        </Link>
      ))}
    </div>
  );
}

function RecentReviewTable({
  guests,
}: {
  guests: SecurityReviewItem[];
}): React.JSX.Element {
  if (guests.length === 0) {
    return (
      <EmptyState
        title="No guest records available"
        description="Guest security records will appear here once guests are created or cleared at the gate."
      />
    );
  }

  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[1100px]">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Presence</th>
              <th>Visit</th>
              <th>Clearance</th>
              <th>Risk</th>
              <th>Latest movement</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id}>
                <td>
                  <div className="font-semibold text-foreground">
                    {guest.full_name}
                  </div>

                  <div className="mt-1 text-xs leading-5 text-muted">
                    {getGuestContext(guest)}
                  </div>

                  <div className="mt-2 text-xs text-muted">
                    {formatLabel(guest.guest_category)}
                  </div>
                </td>

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
                  <div>{getLatestMovementLabel(guest)}</div>

                  {guest.latest_host_name || guest.latest_host_department ? (
                    <div className="mt-1 max-w-[240px] truncate text-xs text-muted">
                      {[guest.latest_host_name, guest.latest_host_department]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  ) : null}
                </td>

                <td className="text-right">
                  <Link
                    href={SECURITY_ROUTES.guestProfile(guest.id)}
                    className="btn-secondary btn-sm"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CompactListCard({
  title,
  description,
  value,
  tone = "default",
  children,
}: {
  title: string;
  description: string;
  value: number;
  tone?: SummaryTone;
  children: React.ReactNode;
}): React.JSX.Element {
  const toneClass: Record<SummaryTone, string> = {
    default: "border-border bg-surface-2 text-muted",
    success: "border-success-600/25 bg-success-50 text-success-700",
    warning: "border-warning-700/25 bg-warning-50 text-warning-700",
    danger: "border-danger-600/25 bg-danger-50 text-danger-700",
    info: "border-info-600/25 bg-info-50 text-info-700",
  };

  return (
    <Card variant="card">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>

          <div
            className={cn(
              "rounded-2xl border px-3 py-2 text-sm font-semibold",
              toneClass[tone],
            )}
          >
            {value}
          </div>
        </div>
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
}

function SmallGuestLink({
  href,
  title,
  subtitle,
  meta,
  children,
}: {
  href: string;
  title: string;
  subtitle: string;
  meta?: string;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-border bg-surface px-4 py-3 transition hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {title}
          </div>

          <div className="mt-1 truncate text-xs text-muted">{subtitle}</div>

          {meta ? (
            <div className="mt-2 text-xs leading-5 text-muted">{meta}</div>
          ) : null}
        </div>

        {children}
      </div>
    </Link>
  );
}

export default async function SecurityDashboardPage({
  searchParams,
}: SecurityDashboardPageProps): Promise<React.JSX.Element> {
  await requirePermission("security.view_clearance");
  await requirePermission("security.view_gate_dashboard");
  await requirePermission("guests.view");

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const [reviewListResult, gateDashboardResult] = await Promise.all([
    getSecurityReviewList(),
    getGateDashboard(),
  ]);

  const reviewList = reviewListResult ?? [];

  const peopleInside = gateDashboardResult?.peopleInside ?? [];
  const pendingReception = gateDashboardResult?.pendingReception ?? [];
  const departedToday = gateDashboardResult?.departedToday ?? [];
  const expectedArrivals = gateDashboardResult?.expectedArrivals ?? [];
  const activeStays = gateDashboardResult?.activeStays ?? [];

  const restrictedGuests = reviewList.filter((guest) =>
    isRestricted(guest.security_clearance_status),
  );

  const highRiskGuests = reviewList.filter(
    (guest) =>
      guest.latest_risk_level === "high" ||
      guest.latest_risk_level === "critical",
  );

  const pendingClearance = reviewList.filter(
    (guest) =>
      !guest.security_clearance_status ||
      guest.security_clearance_status === "pending",
  );

  const highAttentionItems = getHighAttentionItems(reviewList);
  const recentSecurityItems = getRecentSecurityItems(reviewList);
  const latestInsideItems = getLatestInsideItems(peopleInside);

  const errorMessage = getErrorMessage(
    getFirstSearchParam(resolvedSearchParams.error),
  );

  const successMessage = getSuccessMessage(
    getFirstSearchParam(resolvedSearchParams.success),
  );

  return (
    <div className="page-stack">
      <PageHeader
        title="Security dashboard"
        description="Live command view for gate presence, clearance posture, reception handoff, expected arrivals, and confirmed exits."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={SECURITY_ROUTES.gate} className="btn-primary">
              Gate
            </Link>

            <Link
              href={SECURITY_ROUTES.pendingReception}
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
          title="Inside camp"
          value={peopleInside.length}
          description="Open gate entries"
          tone="success"
        />

        <SummaryCard
          title="Pending reception"
          value={pendingReception.length}
          description="Sent forward"
          tone="info"
        />

        <SummaryCard
          title="Departed today"
          value={departedToday.length}
          description="Confirmed exits"
        />

        <SummaryCard
          title="Expected arrivals"
          value={expectedArrivals.length}
          description="Due today"
          tone="warning"
        />

        <SummaryCard
          title="Restricted"
          value={restrictedGuests.length}
          description="Restricted clearance"
          tone="danger"
        />

        <SummaryCard
          title="High risk"
          value={highRiskGuests.length}
          description="High / critical"
          tone="danger"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card variant="card">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Live gate presence</CardTitle>
                <CardDescription>
                  Latest people recorded inside. Security confirms physical exit
                  when they leave.
                </CardDescription>
              </div>

              <Link
                href={SECURITY_ROUTES.gate}
                className="btn-secondary btn-sm"
              >
                Open gate
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid gap-3">
              {latestInsideItems.map((item) => (
                <SecurityPresenceCard
                  key={item.security_event_id}
                  item={item}
                />
              ))}

              {latestInsideItems.length === 0 ? (
                <EmptyState
                  size="sm"
                  title="No active gate entries"
                  description="When security records a guest entering camp, the guest appears here until marked as left."
                />
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card variant="card">
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>
              Pending reception, restricted clearance, and high-risk decisions.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <AlertPanel guests={highAttentionItems} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <CompactListCard
          title="Pending clearance"
          description="Guests whose latest clearance posture still needs review."
          value={pendingClearance.length}
          tone="warning"
        >
          <div className="grid gap-3">
            {pendingClearance.slice(0, 5).map((guest) => (
              <SmallGuestLink
                key={guest.id}
                href={SECURITY_ROUTES.guestProfile(guest.id)}
                title={guest.full_name}
                subtitle={`${guest.primary_camp_name} · ${formatLabel(
                  guest.guest_category,
                )}`}
              />
            ))}

            {pendingClearance.length === 0 ? (
              <EmptyState
                size="sm"
                title="No pending clearance records"
                description="Guests needing clearance review will appear here."
              />
            ) : null}
          </div>
        </CompactListCard>

        <CompactListCard
          title="Reception handoff"
          description="Guests sent by security who require reception follow-up."
          value={pendingReception.length}
          tone="info"
        >
          <div className="grid gap-3">
            {pendingReception.slice(0, 5).map((item) => (
              <SmallGuestLink
                key={item.security_event_id}
                href={SECURITY_ROUTES.guestProfile(item.guest_id)}
                title={item.guest_name}
                subtitle={`${item.camp_name} · ${formatLabel(item.visit_type)}`}
              >
                <VisitTypeBadge visitType={item.visit_type} />
              </SmallGuestLink>
            ))}

            {pendingReception.length === 0 ? (
              <EmptyState
                size="sm"
                title="No guests pending reception"
                description="Guests sent forward to reception will appear here."
              />
            ) : null}
          </div>
        </CompactListCard>

        <CompactListCard
          title="Room presence awareness"
          description="Active stays visible to security for coordination."
          value={activeStays.length}
        >
          <div className="grid gap-3">
            {activeStays.slice(0, 5).map((stay) => (
              <SmallGuestLink
                key={stay.stay_id}
                href={SECURITY_ROUTES.guestProfile(stay.guest_id)}
                title={stay.guest_name}
                subtitle={`${stay.camp_name} · ${stay.building_name} / Room ${stay.room_number}`}
                meta={`Expected departure: ${formatDateTime(
                  stay.expected_departure_at,
                )}`}
              />
            ))}

            {activeStays.length === 0 ? (
              <EmptyState
                size="sm"
                title="No active room stays visible"
                description="Active room stays visible to security will appear here."
              />
            ) : null}
          </div>
        </CompactListCard>
      </section>

      <Card variant="card">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Security register</CardTitle>
              <CardDescription>
                Prioritized by handoff, restriction, active presence, pending
                clearance, and latest movement.
              </CardDescription>
            </div>

            <Link href={SECURITY_ROUTES.gate} className="btn-secondary btn-sm">
              Manage gate
            </Link>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <RecentReviewTable guests={recentSecurityItems} />
        </CardContent>
      </Card>
    </div>
  );
}
