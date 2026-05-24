import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import type { CurrentUserContext } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ClearanceStatusBadge,
  PresenceBadge,
  RiskLevelBadge,
  VisitTypeBadge,
} from "@/components/security/security-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SecurityReviewPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

type GuestCategory =
  | "visitor"
  | "contractor"
  | "vip_guest"
  | "long_stay_guest"
  | "eu_delegate"
  | "american_delegate"
  | string;

type SecurityReviewItem = {
  id: string;
  full_name: string;
  primary_camp_id: string | null;
  primary_camp_name: string;
  guest_category: GuestCategory;
  organization_name: string | null;
  organization: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  security_clearance_status: string | null;
  latest_risk_level: string | null;
  latest_security_note: string | null;
  latest_security_event_at: string | null;
  latest_security_event_id: string | null;
  latest_event_type: string | null;
  latest_visit_type: string | null;
  latest_entry_at: string | null;
  latest_exit_at: string | null;
  latest_sent_to_reception_at: string | null;
  latest_purpose: string | null;
  latest_host_name: string | null;
  latest_host_department: string | null;
  is_currently_inside: boolean;
  is_pending_reception: boolean;
  last_seen_at: string | null;
  created_at: string;
};

type SecurityReviewSummary = {
  total: number;
  inside: number;
  pendingReception: number;
  pending: number;
  cleared: number;
  restricted: number;
};

type SecurityReviewData = {
  summary: SecurityReviewSummary;
  items: SecurityReviewItem[];
};

type RpcError = {
  message: string;
};

type SecurityReviewRpcClient = {
  rpc(
    fn: "get_security_review_snapshot",
    args: {
      p_camp_ids: string[] | null;
      p_limit: number;
    },
  ): Promise<{
    data: unknown;
    error: RpcError | null;
  }>;
};

type PressureTone = "default" | "success" | "warning" | "danger" | "info";

const SECURITY_REVIEW_LIMIT = 120;

const SECURITY_REVIEW_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.DASHBOARD_DEBUG_TIMING === "true";

function createSecurityReviewTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!SECURITY_REVIEW_TIMING_ENABLED) {
      return;
    }

    console.info(
      `[${scope}] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
    );
  };
}

function getSecurityCampIds(currentUser: CurrentUserContext): string[] | null {
  if (currentUser.isSystemActor) {
    return null;
  }

  const campIds = currentUser.campAccess
    .map((access) => access.camp_id)
    .filter(
      (campId): campId is string =>
        typeof campId === "string" && campId.length > 0,
    );

  return [...new Set(campIds)];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, fallback = ""): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : fallback;
}

function nullableTextValue(value: unknown): string | null {
  const normalized = textValue(value);

  return normalized.length > 0 ? normalized : null;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function parseSummary(value: unknown): SecurityReviewSummary {
  const summary = asRecord(value);

  return {
    total: numberValue(summary.total),
    inside: numberValue(summary.inside),
    pendingReception: numberValue(summary.pendingReception),
    pending: numberValue(summary.pending),
    cleared: numberValue(summary.cleared),
    restricted: numberValue(summary.restricted),
  };
}

function parseReviewItem(value: unknown): SecurityReviewItem | null {
  const item = asRecord(value);
  const id = textValue(item.id);
  const fullName = textValue(item.full_name, "Unknown guest");

  if (!id) {
    return null;
  }

  return {
    id,
    full_name: fullName,
    primary_camp_id: nullableTextValue(item.primary_camp_id),
    primary_camp_name: textValue(item.primary_camp_name, "Unknown camp"),
    guest_category: textValue(item.guest_category, "visitor"),
    organization_name: nullableTextValue(item.organization_name),
    organization: nullableTextValue(item.organization),
    nationality: nullableTextValue(item.nationality),
    phone: nullableTextValue(item.phone),
    email: nullableTextValue(item.email),
    security_clearance_status: nullableTextValue(
      item.security_clearance_status,
    ),
    latest_risk_level: nullableTextValue(item.latest_risk_level),
    latest_security_note: nullableTextValue(item.latest_security_note),
    latest_security_event_at: nullableTextValue(item.latest_security_event_at),
    latest_security_event_id: nullableTextValue(item.latest_security_event_id),
    latest_event_type: nullableTextValue(item.latest_event_type),
    latest_visit_type: nullableTextValue(item.latest_visit_type),
    latest_entry_at: nullableTextValue(item.latest_entry_at),
    latest_exit_at: nullableTextValue(item.latest_exit_at),
    latest_sent_to_reception_at: nullableTextValue(
      item.latest_sent_to_reception_at,
    ),
    latest_purpose: nullableTextValue(item.latest_purpose),
    latest_host_name: nullableTextValue(item.latest_host_name),
    latest_host_department: nullableTextValue(item.latest_host_department),
    is_currently_inside: booleanValue(item.is_currently_inside),
    is_pending_reception: booleanValue(item.is_pending_reception),
    last_seen_at: nullableTextValue(item.last_seen_at),
    created_at: textValue(item.created_at, new Date(0).toISOString()),
  };
}

function parseSecurityReviewData(value: unknown): SecurityReviewData {
  const root = asRecord(value);

  return {
    summary: parseSummary(root.summary),
    items: asArray(root.items).flatMap((item) => {
      const parsed = parseReviewItem(item);

      return parsed ? [parsed] : [];
    }),
  };
}

function getEmptySecurityReviewData(): SecurityReviewData {
  return {
    summary: {
      total: 0,
      inside: 0,
      pendingReception: 0,
      pending: 0,
      cleared: 0,
      restricted: 0,
    },
    items: [],
  };
}

async function getSecurityReviewData(
  currentUser: CurrentUserContext,
  mark: (label: string) => void,
): Promise<SecurityReviewData> {
  const campIds = getSecurityCampIds(currentUser);

  if (campIds !== null && campIds.length === 0) {
    return getEmptySecurityReviewData();
  }

  const admin =
    createSupabaseAdminClient() as unknown as SecurityReviewRpcClient;

  mark("admin client created");

  const { data, error } = await admin.rpc("get_security_review_snapshot", {
    p_camp_ids: campIds,
    p_limit: SECURITY_REVIEW_LIMIT,
  });

  mark("security review snapshot loaded");

  if (error) {
    console.error("Failed to load security review snapshot:", error.message);
    return getEmptySecurityReviewData();
  }

  return parseSecurityReviewData(data);
}

function formatLabel(value: string | null): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Kampala",
  }).format(date);
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

function PressureCell({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: PressureTone;
}): React.JSX.Element {
  const toneClass: Record<PressureTone, string> = {
    default: "bg-surface",
    success: "bg-success-50/60",
    warning: "bg-warning-50/70",
    danger: "bg-danger-50/60",
    info: "bg-info-50/60",
  };

  return (
    <article className={cn("px-4 py-3", toneClass[tone])}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {label}
        </p>

        <p className="text-xl font-semibold tracking-[-0.04em] text-foreground">
          {value}
        </p>
      </div>

      <p className="mt-1 truncate text-xs text-muted">{hint}</p>
    </article>
  );
}

export default async function SecurityReviewPage({
  searchParams,
}: SecurityReviewPageProps): Promise<React.JSX.Element> {
  noStore();

  const mark = createSecurityReviewTimer("security:review");

  const currentUser = await requirePermission("security.view_clearance");
  mark("security.view_clearance permission checked");

  await requirePermission("guests.view");
  mark("guests.view permission checked");

  const [query, data] = await Promise.all([
    searchParams,
    getSecurityReviewData(currentUser, mark),
  ]);

  mark("security review data prepared");

  const summary = data.summary;
  const guests = data.items;
  const errorMessage = getErrorMessage(query?.error);

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 border-b border-border px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Security clearance control
            </p>

            <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
              Security review
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Review guest clearance posture, current gate presence, reception
              handoff state, and latest security notes from one operational
              register.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href={APP_ROUTES.security.gate} className="btn-primary">
              Gate operations
            </Link>
          </div>
        </div>

        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-6">
          <PressureCell
            label="Visible"
            value={summary.total}
            hint="Guests in review scope"
          />

          <PressureCell
            label="Inside"
            value={summary.inside}
            hint="Open gate entries"
            tone="success"
          />

          <PressureCell
            label="Reception"
            value={summary.pendingReception}
            hint="Sent from security"
            tone="info"
          />

          <PressureCell
            label="Pending"
            value={summary.pending}
            hint="Awaiting decision"
            tone="warning"
          />

          <PressureCell
            label="Cleared"
            value={summary.cleared}
            hint="Approved guests"
            tone="success"
          />

          <PressureCell
            label="Restricted"
            value={summary.restricted}
            hint="Watchlist / denied"
            tone="danger"
          />
        </div>
      </section>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      <Card variant="console">
        <CardHeader className="border-b border-border px-4 py-4">
          <div className="max-w-3xl">
            <CardTitle>Guest security register</CardTitle>

            <p className="mt-1 text-sm leading-6 text-muted">
              Priority order: pending reception, people inside, restricted
              records, then latest reviewed guests. Showing up to{" "}
              {SECURITY_REVIEW_LIMIT} records.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="table-shell rounded-none border-0 shadow-none">
            <div className="table-scroll">
              <table className="data-table min-w-[1180px] table-fixed [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5">
                <colgroup>
                  <col className="w-[210px]" />
                  <col className="w-[140px]" />
                  <col className="w-[145px]" />
                  <col className="w-[150px]" />
                  <col className="w-[125px]" />
                  <col className="w-[115px]" />
                  <col className="w-[175px]" />
                  <col className="w-[120px]" />
                </colgroup>

                <thead>
                  <tr>
                    <th className="text-left">Guest</th>
                    <th className="text-left">Camp</th>
                    <th className="text-left">Presence</th>
                    <th className="text-left">Visit</th>
                    <th className="text-left">Clearance</th>
                    <th className="text-left">Risk</th>
                    <th className="text-left">Latest movement</th>
                    <th className="text-left">Latest note</th>
                  </tr>
                </thead>

                <tbody>
                  {guests.map((guest) => (
                    <tr key={guest.id} className="align-top">
                      <td>
                        <Link
                          href={APP_ROUTES.security.guestProfile(guest.id)}
                          className="block truncate font-semibold text-foreground underline-offset-4 hover:underline"
                          title={guest.full_name}
                        >
                          {guest.full_name}
                        </Link>

                        <div
                          className="mt-1 line-clamp-2 text-xs leading-5 text-muted"
                          title={getContextLine(guest)}
                        >
                          {getContextLine(guest)}
                        </div>

                        <div className="mt-1.5 text-xs text-muted">
                          {formatLabel(guest.guest_category)}
                        </div>
                      </td>

                      <td className="text-sm text-muted">
                        <div
                          className="leading-5"
                          title={guest.primary_camp_name}
                        >
                          {guest.primary_camp_name}
                        </div>
                      </td>

                      <td>
                        <PresenceBadge
                          isInside={guest.is_currently_inside}
                          isPendingReception={guest.is_pending_reception}
                        />
                      </td>

                      <td>
                        <div className="flex flex-col items-start gap-1.5">
                          <VisitTypeBadge visitType={guest.latest_visit_type} />

                          {guest.latest_purpose ? (
                            <div
                              className="line-clamp-2 text-xs leading-5 text-muted"
                              title={guest.latest_purpose}
                            >
                              {guest.latest_purpose}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td>
                        <ClearanceStatusBadge
                          status={guest.security_clearance_status}
                        />
                      </td>

                      <td>
                        <RiskLevelBadge riskLevel={guest.latest_risk_level} />
                      </td>

                      <td className="text-sm text-muted">
                        <div
                          className="line-clamp-2 leading-5"
                          title={getLatestMovementLabel(guest)}
                        >
                          {getLatestMovementLabel(guest)}
                        </div>

                        {guest.latest_host_name ||
                        guest.latest_host_department ? (
                          <div className="mt-1 truncate text-xs text-muted">
                            {[
                              guest.latest_host_name,
                              guest.latest_host_department,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        ) : null}
                      </td>

                      <td className="text-sm text-muted">
                        <div
                          className="line-clamp-2 leading-5"
                          title={guest.latest_security_note ?? "—"}
                        >
                          {guest.latest_security_note ?? "—"}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {guests.length === 0 ? (
                    <tr className="table-empty-row">
                      <td colSpan={8}>No guests found for security review.</td>
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
