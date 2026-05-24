import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { requirePermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import type { CurrentUserContext } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ClearanceStatusBadge,
  PresenceBadge,
  VisitTypeBadge,
} from "@/components/security/security-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";
import {
  canVisitTypeBeSentToReception,
  securityVisitTypeSchema,
} from "@/lib/validation/security";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageSearchParams = {
  error?: string | string[];
};

type PendingReceptionPageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

type GuestCategory =
  | "visitor"
  | "contractor"
  | "vip_guest"
  | "long_stay_guest"
  | "eu_delegate"
  | "american_delegate"
  | string;

type PendingReceptionItem = {
  security_event_id: string;
  handoff_event_id?: string | null;
  guest_id: string;
  guest_name: string;
  guest_category: GuestCategory | null;
  organization_name: string | null;
  security_clearance_status: string | null;
  camp_name: string;
  visit_type: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  entry_at: string | null;
  sent_to_reception_at: string | null;
  latest_sent_to_reception_at?: string | null;
  exit_at: string | null;
};

type SummaryTone = "default" | "success" | "warning" | "danger" | "info";

type RpcError = {
  message: string;
};

type GateOperationsRpcClient = {
  rpc(
    fn: "get_gate_operations_snapshot",
    args: {
      p_camp_ids: string[] | null;
      p_start_at: string;
      p_end_at: string;
    },
  ): Promise<{
    data: unknown;
    error: RpcError | null;
  }>;
};

const OPERATIONAL_TIME_ZONE = "Africa/Kampala";

const PENDING_RECEPTION_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.DASHBOARD_DEBUG_TIMING === "true";

function createPendingReceptionTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!PENDING_RECEPTION_TIMING_ENABLED) {
      return;
    }

    console.info(
      `[${scope}] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
    );
  };
}

function getFirstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getOperationalDayBounds(): { start: string; end: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATIONAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!year || !month || !day) {
    const fallbackStart = new Date();
    fallbackStart.setHours(0, 0, 0, 0);

    const fallbackEnd = new Date(fallbackStart);
    fallbackEnd.setDate(fallbackEnd.getDate() + 1);

    return {
      start: fallbackStart.toISOString(),
      end: fallbackEnd.toISOString(),
    };
  }

  const start = new Date(Date.UTC(year, month - 1, day, -3, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
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

function parsePendingReceptionItem(
  value: unknown,
): PendingReceptionItem | null {
  const item = asRecord(value);
  const securityEventId = textValue(item.security_event_id);
  const guestId = textValue(item.guest_id);

  if (!securityEventId || !guestId) {
    return null;
  }

  return {
    security_event_id: securityEventId,
    handoff_event_id: nullableTextValue(item.handoff_event_id),
    guest_id: guestId,
    guest_name: textValue(item.guest_name, "Unknown guest"),
    guest_category: nullableTextValue(item.guest_category),
    organization_name: nullableTextValue(item.organization_name),
    security_clearance_status: nullableTextValue(
      item.security_clearance_status,
    ),
    camp_name: textValue(item.camp_name, "Unknown camp"),
    visit_type: nullableTextValue(item.visit_type),
    purpose: nullableTextValue(item.purpose),
    host_name: nullableTextValue(item.host_name),
    host_department: nullableTextValue(item.host_department),
    entry_at: nullableTextValue(item.entry_at),
    sent_to_reception_at: nullableTextValue(item.sent_to_reception_at),
    latest_sent_to_reception_at: nullableTextValue(
      item.latest_sent_to_reception_at,
    ),
    exit_at: nullableTextValue(item.exit_at),
  };
}

function parsePendingReceptionItems(snapshot: unknown): PendingReceptionItem[] {
  const root = asRecord(snapshot);

  return asArray(root.pendingReception).flatMap((item) => {
    const parsed = parsePendingReceptionItem(item);

    return parsed ? [parsed] : [];
  });
}

async function getPendingReceptionItems(
  currentUser: CurrentUserContext,
  mark: (label: string) => void,
): Promise<PendingReceptionItem[]> {
  const campIds = getSecurityCampIds(currentUser);

  if (campIds !== null && campIds.length === 0) {
    return [];
  }

  const { start, end } = getOperationalDayBounds();

  const admin =
    createSupabaseAdminClient() as unknown as GateOperationsRpcClient;

  mark("admin client created");

  const { data, error } = await admin.rpc("get_gate_operations_snapshot", {
    p_camp_ids: campIds,
    p_start_at: start,
    p_end_at: end,
  });

  mark("gate operations snapshot loaded");

  if (error) {
    console.error("Failed to load pending reception snapshot:", error.message);
    return [];
  }

  return sortPendingReceptionItems(parsePendingReceptionItems(data));
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
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: OPERATIONAL_TIME_ZONE,
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

function getSentToReceptionAt(item: PendingReceptionItem): string | null {
  return item.latest_sent_to_reception_at ?? item.sent_to_reception_at;
}

function isInsideCamp(item: PendingReceptionItem): boolean {
  return Boolean(item.entry_at) && !item.exit_at;
}

function isPendingReception(item: PendingReceptionItem): boolean {
  return Boolean(getSentToReceptionAt(item)) && !item.exit_at;
}

function isReceptionEligibleVisitType(
  visitType: string | null | undefined,
): boolean {
  const parsed = securityVisitTypeSchema.safeParse(visitType);

  return parsed.success && canVisitTypeBeSentToReception(parsed.data);
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
    guest_not_inside: "Guest is not currently inside the camp.",
    guest_already_inside: "Guest already has an active gate entry.",
    guest_already_departed: "Guest has already been marked as left.",
    already_pending_reception: "Guest is already pending reception.",
    not_reception_eligible:
      "Only overnight guests, delegates, and VIPs can be sent to reception.",
    invalid_guest_camp: "Guest does not belong to the selected camp.",
    invalid_clearance_status: "Security clearance status is invalid.",
    invalid_visit_type: "Visit type is invalid.",
    invalid_risk_level: "Risk level is invalid.",
    security_notes_required:
      "Security notes are required for this clearance decision.",
    access_denied: "You do not have access to perform that security action.",
    security_action_failed: "Security action could not be completed.",
  };

  return messages[error] ?? "Pending reception queue could not be loaded.";
}

function sortPendingReceptionItems(
  items: PendingReceptionItem[],
): PendingReceptionItem[] {
  return [...items].sort((a, b) => {
    const aDate = getSentToReceptionAt(a) ?? a.entry_at ?? "";
    const bDate = getSentToReceptionAt(b) ?? b.entry_at ?? "";

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

function getHostLabel(item: PendingReceptionItem): string {
  const parts = [item.host_name, item.host_department].filter(
    (value): value is string => Boolean(value),
  );

  return parts.length > 0 ? parts.join(" · ") : "—";
}

function SummaryCell({
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
          {title}
        </p>

        <p className="text-xl font-semibold tracking-[-0.04em] text-foreground">
          {value}
        </p>
      </div>

      <p className="mt-1 truncate text-xs text-muted">{description}</p>
    </article>
  );
}

function EmptyReceptionQueue(): React.JSX.Element {
  return (
    <div className="p-4">
      <EmptyState
        title="No guests pending reception"
        description="Guests cleared by security and sent forward to reception will appear here until reception completes the next handling step."
        action={
          <Link href={APP_ROUTES.security.gate} className="btn-primary">
            Open gate operations
          </Link>
        }
      />
    </div>
  );
}

function PendingReceptionTable({
  items,
}: {
  items: PendingReceptionItem[];
}): React.JSX.Element {
  if (items.length === 0) {
    return <EmptyReceptionQueue />;
  }

  return (
    <div className="table-shell rounded-none border-0 shadow-none">
      <div className="table-scroll">
        <table className="data-table min-w-[1160px] table-fixed [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-2.5">
          <colgroup>
            <col className="w-[190px]" />
            <col className="w-[140px]" />
            <col className="w-[135px]" />
            <col className="w-[145px]" />
            <col className="w-[120px]" />
            <col className="w-[135px]" />
            <col className="w-[160px]" />
            <col className="w-[135px]" />
          </colgroup>

          <thead>
            <tr>
              <th className="text-left">Guest</th>
              <th className="text-left">Presence</th>
              <th className="text-left">Camp</th>
              <th className="text-left">Visit</th>
              <th className="text-left">Clearance</th>
              <th className="text-left">Entry</th>
              <th className="text-left">Sent to reception</th>
              <th className="text-left">Host</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => {
              const sentToReceptionAt = getSentToReceptionAt(item);

              return (
                <tr
                  key={item.handoff_event_id ?? item.security_event_id}
                  className="align-top"
                >
                  <td>
                    <Link
                      href={APP_ROUTES.security.guestProfile(item.guest_id)}
                      className="block truncate font-semibold text-foreground underline-offset-4 hover:underline"
                      title={item.guest_name}
                    >
                      {item.guest_name}
                    </Link>

                    <div
                      className="mt-1 line-clamp-2 text-xs leading-5 text-muted"
                      title={getGuestContext(item)}
                    >
                      {getGuestContext(item)}
                    </div>
                  </td>

                  <td>
                    <div className="flex min-w-0 items-start">
                      <PresenceBadge
                        isInside={isInsideCamp(item)}
                        isPendingReception={isPendingReception(item)}
                      />
                    </div>
                  </td>

                  <td className="text-sm text-muted">
                    <div className="leading-5" title={item.camp_name}>
                      {item.camp_name}
                    </div>
                  </td>

                  <td>
                    <div className="flex flex-col items-start gap-1.5">
                      <VisitTypeBadge visitType={item.visit_type} />

                      {item.purpose ? (
                        <div
                          className="line-clamp-2 text-xs leading-5 text-muted"
                          title={item.purpose}
                        >
                          {item.purpose}
                        </div>
                      ) : null}
                    </div>
                  </td>

                  <td>
                    <ClearanceStatusBadge
                      status={item.security_clearance_status}
                    />
                  </td>

                  <td className="text-sm text-muted">
                    <time
                      className="block leading-5 tabular-nums"
                      dateTime={item.entry_at ?? undefined}
                    >
                      {formatDateTime(item.entry_at)}
                    </time>
                  </td>

                  <td className="text-sm text-muted">
                    <time
                      className="block leading-5 tabular-nums"
                      dateTime={sentToReceptionAt ?? undefined}
                    >
                      {formatDateTime(sentToReceptionAt)}
                    </time>
                  </td>

                  <td className="text-sm text-muted">
                    <div
                      className="line-clamp-2 leading-5"
                      title={getHostLabel(item)}
                    >
                      {getHostLabel(item)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function PendingReceptionPage({
  searchParams,
}: PendingReceptionPageProps): Promise<React.JSX.Element> {
  noStore();

  const mark = createPendingReceptionTimer("security:pending-reception");

  const currentUser = await requirePermission("security.view_gate_dashboard");
  mark("security.view_gate_dashboard permission checked");

  await requirePermission("guests.view");
  mark("guests.view permission checked");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  mark("search params resolved");

  const pendingReception = await getPendingReceptionItems(currentUser, mark);
  mark("pending reception data prepared");

  const errorMessage = getErrorMessage(
    getFirstSearchParam(resolvedSearchParams.error),
  );

  const priorityReceptionCount = pendingReception.filter((item) =>
    isReceptionEligibleVisitType(item.visit_type),
  ).length;

  const missingHostCount = pendingReception.filter(
    (item) => !item.host_name || item.host_name.trim().length === 0,
  ).length;

  const insideCount = pendingReception.filter(isInsideCamp).length;

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-4 border-b border-border px-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Security handoff control
            </p>

            <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-foreground sm:text-2xl">
              Pending reception
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Guests cleared by security and handed forward for reception
              handling. Reception remains responsible for allocation, check-in,
              or follow-up.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Link href={APP_ROUTES.security.gate} className="btn-primary">
              Gate operations
            </Link>
          </div>
        </div>

        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <SummaryCell
            title="Pending reception"
            value={pendingReception.length}
            description="Waiting for follow-up"
            tone="info"
          />

          <SummaryCell
            title="Priority guests"
            value={priorityReceptionCount}
            description="Overnight / VIP / delegates"
            tone="warning"
          />

          <SummaryCell
            title="Missing host"
            value={missingHostCount}
            description="Host not recorded"
            tone={missingHostCount > 0 ? "danger" : "default"}
          />

          <SummaryCell
            title="Inside camp"
            value={insideCount}
            description="Not marked left"
            tone="success"
          />
        </div>
      </section>

      {errorMessage ? (
        <div className="alert alert-danger">{errorMessage}</div>
      ) : null}

      <Card variant="console">
        <CardHeader className="border-b border-border px-4 py-4">
          <div className="max-w-3xl">
            <CardTitle>Reception handoff register</CardTitle>

            <p className="mt-1 text-sm leading-6 text-muted">
              Sorted by latest handoff or gate entry. Guest names open the
              security profile directly.
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <PendingReceptionTable items={pendingReception} />
        </CardContent>
      </Card>
    </div>
  );
}
