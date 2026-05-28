import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { GuestNameWithPhoto } from "@/components/guests/guest-avatar";
import { GateExitForm } from "@/components/security/gate-exit-form";
import { SendToReceptionButton } from "@/components/security/send-to-reception-button";
import {
  ClearanceStatusBadge,
  PresenceBadge,
  VisitTypeBadge,
} from "@/components/security/security-status-badge";
import { Card, CardContent } from "@/components/ui/Card";
import {
  canVisitTypeBeSentToReception,
  securityVisitTypeSchema,
} from "@/lib/validation/security";

export type SecurityPresenceCardItem = {
  security_event_id: string;
  guest_id: string;
  guest_name: string;
  guest_category: string | null;
  organization_name: string | null;
  security_clearance_status: string | null;
  camp_name: string;
  visit_type: string | null;
  purpose: string | null;
  host_name: string | null;
  host_department: string | null;
  entry_at: string | null;

  /**
   * Keep this for backward compatibility.
   * After the DB fix, this should represent latest handoff time,
   * not necessarily a column on the active gate_entry row.
   */
  sent_to_reception_at: string | null;

  /**
   * Preferred field if your active_security_presence view exposes it.
   */
  latest_sent_to_reception_at?: string | null;

  exit_at: string | null;
};

type SecurityPresenceCardProps = {
  item: SecurityPresenceCardItem;
  showExitAction?: boolean;
  showSendToReceptionAction?: boolean;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSentToReceptionAt(item: SecurityPresenceCardItem): string | null {
  return item.latest_sent_to_reception_at ?? item.sent_to_reception_at ?? null;
}

function isReceptionEligibleVisitType(visitType: string | null): boolean {
  const parsed = securityVisitTypeSchema.safeParse(visitType);

  return parsed.success && canVisitTypeBeSentToReception(parsed.data);
}

function shouldShowReceptionAction(item: SecurityPresenceCardItem): boolean {
  const sentToReceptionAt = getSentToReceptionAt(item);

  if (!item.entry_at || item.exit_at || sentToReceptionAt) {
    return false;
  }

  return isReceptionEligibleVisitType(item.visit_type);
}

function getHostLabel(item: SecurityPresenceCardItem): string {
  const parts = [item.host_name, item.host_department].filter(
    (value): value is string => Boolean(value),
  );

  return parts.length > 0 ? parts.join(" · ") : "—";
}

function getGuestContext(item: SecurityPresenceCardItem): string {
  const parts = [
    item.organization_name,
    formatLabel(item.guest_category),
    item.camp_name,
  ].filter((value) => value && value !== "—");

  return parts.length > 0 ? parts.join(" · ") : item.camp_name;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): React.JSX.Element {
  return (
    <div className="grid gap-2 border-b border-border py-2.5 last:border-b-0 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>

      <dd className="min-w-0 text-sm leading-5 text-foreground">{value}</dd>
    </div>
  );
}

export function SecurityPresenceCard({
  item,
  showExitAction = true,
  showSendToReceptionAction = true,
}: SecurityPresenceCardProps): React.JSX.Element {
  const sentToReceptionAt = getSentToReceptionAt(item);
  const isInside = Boolean(item.entry_at) && !item.exit_at;
  const isPendingReception = Boolean(sentToReceptionAt) && !item.exit_at;

  const canSendToReception =
    showSendToReceptionAction && shouldShowReceptionAction(item);

  const canShowExit = showExitAction && isInside;
  const hasActions = canSendToReception || canShowExit;

  return (
    <Card variant="console" className="min-w-0 overflow-hidden">
      <CardContent className="p-0">
        <details className="group">
          <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 transition hover:bg-surface-muted/45 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <GuestNameWithPhoto
                  guestId={item.guest_id}
                  name={item.guest_name}
                />

                <PresenceBadge
                  isInside={isInside}
                  isPendingReception={isPendingReception}
                />
              </div>

              <p className="mt-1 truncate text-xs text-muted">
                {getGuestContext(item)}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:justify-end">
              {canSendToReception ? (
                <SendToReceptionButton
                  securityEventId={item.security_event_id}
                  compact
                />
              ) : null}

              {canShowExit ? (
                <GateExitForm
                  securityEventId={item.security_event_id}
                  guestName={item.guest_name}
                  entryAt={item.entry_at}
                  compact
                />
              ) : null}

              {!hasActions ? (
                <span className="text-xs font-semibold text-muted">
                  No action
                </span>
              ) : null}
            </div>

            <span
              aria-label="Show details"
              className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-surface text-muted transition group-open:bg-surface-muted"
            >
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 transition-transform group-open:rotate-180"
              />
            </span>
          </summary>

          <div className="border-t border-border bg-surface-muted/30 px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <VisitTypeBadge visitType={item.visit_type} />
              <ClearanceStatusBadge status={item.security_clearance_status} />
            </div>

            <dl>
              <DetailRow label="Purpose" value={item.purpose || "—"} />
              <DetailRow label="Host" value={getHostLabel(item)} />
              <DetailRow label="Entry" value={formatDateTime(item.entry_at)} />
              <DetailRow
                label="Reception"
                value={
                  sentToReceptionAt
                    ? `Sent ${formatDateTime(sentToReceptionAt)}`
                    : "Not sent"
                }
              />
              <DetailRow
                label="Exit"
                value={
                  item.exit_at
                    ? `Left ${formatDateTime(item.exit_at)}`
                    : isInside
                      ? "Inside"
                      : "—"
                }
              />
            </dl>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
