import Link from "next/link";
import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { PageHeader } from "@/components/layout/page-header";
import { getGateDashboard } from "@/lib/queries/security/get-gate-dashboard";
import { SecurityPresenceCard } from "@/components/security/security-presence-card";
import {
  ClearanceStatusBadge,
  PresenceBadge,
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

type PendingReceptionPageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

type GateDashboard = Awaited<ReturnType<typeof getGateDashboard>>;
type PendingReceptionItem = GateDashboard["pendingReception"][number];

type SummaryTone = "default" | "success" | "warning" | "danger" | "info";

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

function getErrorMessage(error?: string): string | null {
  if (!error) {
    return null;
  }

  const messages: Record<string, string> = {
    invalid_input: "Check the reception handoff record and try again.",
    invalid_security_event: "Security event was not found or is invalid.",
    security_event_not_found: "Security event was not found.",
    guest_not_found: "Guest record was not found.",
    access_denied: "You do not have access to perform that security action.",
    security_action_failed: "Security action could not be completed.",
  };

  return messages[error] ?? "Pending reception queue could not be loaded.";
}

function getSuccessMessage(success?: string): string | null {
  if (!success) {
    return null;
  }

  const messages: Record<string, string> = {
    sent_to_reception: "Guest sent to reception successfully.",
    gate_exit_recorded: "Gate exit recorded successfully.",
    clearance_updated: "Security clearance updated successfully.",
  };

  return messages[success] ?? null;
}

function sortPendingReceptionItems(
  items: PendingReceptionItem[],
): PendingReceptionItem[] {
  return [...items].sort((a, b) => {
    const aDate = a.sent_to_reception_at ?? a.entry_at ?? "";
    const bDate = b.sent_to_reception_at ?? b.entry_at ?? "";

    return bDate.localeCompare(aDate);
  });
}

function getGuestContext(item: PendingReceptionItem): string {
  const parts = [
    item.organization_name,
    formatLabel(item.guest_category),
  ].filter((value) => value && value !== "—");

  return parts.length > 0 ? parts.join(" · ") : "No organization recorded";
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

function EmptyReceptionQueue(): React.JSX.Element {
  return (
    <EmptyState
      title="No guests pending reception"
      description="Guests cleared by security and sent forward to reception will appear here until reception completes the next handling step."
      action={
        <Link href={APP_ROUTES.security.gate} className="btn-primary">
          Open gate operations
        </Link>
      }
    />
  );
}

function PendingReceptionTable({
  items,
}: {
  items: PendingReceptionItem[];
}): React.JSX.Element {
  if (items.length === 0) {
    return (
      <div className="p-5">
        <EmptyReceptionQueue />
      </div>
    );
  }

  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[1120px]">
          <thead>
            <tr>
              <th>Guest</th>
              <th>Presence</th>
              <th>Camp</th>
              <th>Visit</th>
              <th>Clearance</th>
              <th>Entry</th>
              <th>Sent to reception</th>
              <th>Host</th>
              <th />
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.security_event_id}>
                <td>
                  <div className="font-semibold text-foreground">
                    {item.guest_name}
                  </div>

                  <div className="mt-1 max-w-[240px] text-xs leading-5 text-muted">
                    {getGuestContext(item)}
                  </div>
                </td>

                <td>
                  <PresenceBadge
                    isInside={!item.exit_at}
                    isPendingReception={Boolean(item.sent_to_reception_at)}
                  />
                </td>

                <td className="text-muted">{item.camp_name}</td>

                <td>
                  <VisitTypeBadge visitType={item.visit_type} />

                  {item.purpose ? (
                    <div className="mt-2 max-w-[220px] truncate text-xs text-muted">
                      {item.purpose}
                    </div>
                  ) : null}
                </td>

                <td>
                  <ClearanceStatusBadge
                    status={item.security_clearance_status}
                  />
                </td>

                <td className="text-muted">{formatDateTime(item.entry_at)}</td>

                <td className="text-muted">
                  {formatDateTime(item.sent_to_reception_at)}
                </td>

                <td className="text-muted">
                  <div>{item.host_name ?? "—"}</div>

                  {item.host_department ? (
                    <div className="mt-1 text-xs text-muted">
                      {item.host_department}
                    </div>
                  ) : null}
                </td>

                <td className="text-right">
                  <Link
                    href={APP_ROUTES.security.guestProfile(item.guest_id)}
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

function PendingReceptionCards({
  items,
}: {
  items: PendingReceptionItem[];
}): React.JSX.Element {
  if (items.length === 0) {
    return <EmptyReceptionQueue />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <SecurityPresenceCard
          key={item.security_event_id}
          item={item}
          showSendToReceptionAction={false}
        />
      ))}
    </div>
  );
}

export default async function PendingReceptionPage({
  searchParams,
}: PendingReceptionPageProps): Promise<React.JSX.Element> {
  await requirePermission("security.view_clearance");
  await requirePermission("guests.view");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const gateDashboard = await getGateDashboard();

  const pendingReception = sortPendingReceptionItems(
    gateDashboard.pendingReception ?? [],
  );

  const errorMessage = getErrorMessage(
    getFirstSearchParam(resolvedSearchParams.error),
  );

  const successMessage = getSuccessMessage(
    getFirstSearchParam(resolvedSearchParams.success),
  );

  const priorityReceptionCount = pendingReception.filter((item) =>
    ["overnight_guest", "delegate", "vip"].includes(item.visit_type ?? ""),
  ).length;

  const missingHostCount = pendingReception.filter(
    (item) => !item.host_name || item.host_name.trim().length === 0,
  ).length;

  const insideCount = pendingReception.filter((item) => !item.exit_at).length;

  return (
    <div className="page-stack">
      <PageHeader
        title="Pending reception"
        description="Guests cleared by security and handed forward for reception handling."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={APP_ROUTES.security.review} className="btn-secondary">
              Security review
            </Link>

            <Link href={APP_ROUTES.security.gate} className="btn-primary">
              Gate operations
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Pending reception"
          value={pendingReception.length}
          description="Waiting for follow-up"
          tone="info"
        />

        <SummaryCard
          title="Priority guests"
          value={priorityReceptionCount}
          description="Overnight / VIP / delegates"
          tone="warning"
        />

        <SummaryCard
          title="Missing host"
          value={missingHostCount}
          description="Host not recorded"
          tone={missingHostCount > 0 ? "danger" : "default"}
        />

        <SummaryCard
          title="Inside camp"
          value={insideCount}
          description="Not marked left"
          tone="success"
        />
      </section>

      <Card variant="card">
        <CardHeader>
          <CardTitle>Reception handoff queue</CardTitle>
          <CardDescription>
            Security can monitor guests already sent forward. Reception remains
            responsible for the next handling step.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <PendingReceptionCards items={pendingReception} />
        </CardContent>
      </Card>

      <Card variant="card">
        <CardHeader>
          <CardTitle>Detailed handoff register</CardTitle>
          <CardDescription>
            Full reception handoff list sorted by latest handoff or gate entry.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <PendingReceptionTable items={pendingReception} />
        </CardContent>
      </Card>
    </div>
  );
}
