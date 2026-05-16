import type { ReactNode } from "react";
import { GateExitForm } from "@/components/security/gate-exit-form";
import { SendToReceptionButton } from "@/components/security/send-to-reception-button";
import {
  ClearanceStatusBadge,
  PresenceBadge,
  VisitTypeBadge,
} from "@/components/security/security-status-badge";
import { Card, CardContent } from "@/components/ui/Card";

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
  sent_to_reception_at: string | null;
  exit_at: string | null;
};

type SecurityPresenceCardProps = {
  item: SecurityPresenceCardItem;
  showExitAction?: boolean;
  showSendToReceptionAction?: boolean;
};

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

function shouldShowReceptionAction(item: SecurityPresenceCardItem): boolean {
  if (item.exit_at || item.sent_to_reception_at) {
    return false;
  }

  return (
    item.visit_type === "overnight_guest" ||
    item.visit_type === "delegate" ||
    item.visit_type === "vip"
  );
}

function getHostLabel(item: SecurityPresenceCardItem): string {
  const parts = [item.host_name, item.host_department].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "—";
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface-2 px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>

      <dd className="mt-1 truncate text-xs font-semibold leading-5 text-foreground">
        {value}
      </dd>
    </div>
  );
}

export function SecurityPresenceCard({
  item,
  showExitAction = true,
  showSendToReceptionAction = true,
}: SecurityPresenceCardProps): React.JSX.Element {
  const isInside = Boolean(item.entry_at) && !item.exit_at;
  const isPendingReception =
    item.sent_to_reception_at !== null && item.exit_at === null;

  const canSendToReception =
    showSendToReceptionAction && shouldShowReceptionAction(item);

  const canShowExit = showExitAction && isInside;
  const hasActions = canSendToReception || canShowExit;

  return (
    <Card variant="card" className="overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b border-border bg-surface-2/55 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <PresenceBadge
                  isInside={isInside}
                  isPendingReception={isPendingReception}
                />

                <VisitTypeBadge visitType={item.visit_type} />

                <ClearanceStatusBadge status={item.security_clearance_status} />
              </div>

              <h3 className="mt-2 truncate text-base font-semibold tracking-[-0.025em] text-foreground">
                {item.guest_name}
              </h3>

              <p className="mt-0.5 truncate text-xs leading-5 text-muted">
                {item.organization_name || "No organization recorded"} ·{" "}
                {item.camp_name}
              </p>
            </div>

            <div className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                Entry
              </div>

              <div className="mt-1 text-xs font-semibold text-foreground">
                {formatDateTime(item.entry_at)}
              </div>
            </div>
          </div>
        </div>

        <dl className="grid gap-2 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailBlock label="Purpose" value={item.purpose || "—"} />

          <DetailBlock label="Host" value={getHostLabel(item)} />

          <DetailBlock
            label="Reception"
            value={
              item.sent_to_reception_at
                ? `Sent ${formatDateTime(item.sent_to_reception_at)}`
                : "Not sent"
            }
          />

          <DetailBlock
            label="Exit"
            value={
              item.exit_at ? `Left ${formatDateTime(item.exit_at)}` : "Inside"
            }
          />
        </dl>

        {hasActions ? (
          <div className="border-t border-border bg-surface-2/40 px-4 py-3">
            <div className="grid gap-3 md:grid-cols-2">
              {canSendToReception ? (
                <SendToReceptionButton
                  securityEventId={item.security_event_id}
                  compact
                />
              ) : (
                <div className="hidden md:block" />
              )}

              {canShowExit ? (
                <GateExitForm
                  securityEventId={item.security_event_id}
                  guestName={item.guest_name}
                  entryAt={item.entry_at}
                  compact
                />
              ) : null}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
