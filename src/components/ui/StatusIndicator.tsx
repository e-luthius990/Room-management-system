import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type StatusTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "brand"
  | "muted";

export type StatusIndicatorProps = Omit<
  React.ComponentPropsWithoutRef<"span">,
  "children"
> & {
  label: React.ReactNode;
  tone?: StatusTone;
  status?: string | null;
  statusClassName?: string;
  withDot?: boolean;
  compact?: boolean;
};

const toneClass: Record<StatusTone, string> = {
  success: "status-vacant-ready",
  info: "status-occupied",
  warning: "status-reserved",
  danger: "status-under-maintenance",
  brand: "status-needs-cleaning",
  muted: "status-muted",
};

const STATUS_LABELS: Record<string, string> = {
  vacant_ready: "Vacant Ready",
  pending_check_in: "Pending Check-in",
  pending_checkout: "Pending Checkout",
  pending_check_out: "Pending Checkout",
  out_of_service: "Out of Service",
  under_maintenance: "Under Maintenance",
  manager_hold: "Manager Hold",
  no_show: "No-show",
  checked_in: "Checked In",
  sent_to_reception: "Sent to Reception",
  in_camp: "In Camp",
  gate_entry: "Gate Entry",
  gate_exit: "Gate Exit",
};

function normalizeStatusValue(
  status: string | null | undefined,
): string | null {
  const raw = status?.trim();

  if (!raw) {
    return null;
  }

  const normalized = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized.length > 0 ? normalized : null;
}

export function normalizeStatusClass(
  status: string | null | undefined,
): string {
  const normalized = normalizeStatusValue(status);
  return normalized ? `status-${normalized}` : "status-muted";
}

export function formatStatusLabel(status: string | null | undefined): string {
  const raw = status?.trim();

  if (!raw) {
    return "Unknown";
  }

  const directLabel = STATUS_LABELS[raw];

  if (directLabel) {
    return directLabel;
  }

  const normalizedKey = raw.toLowerCase().replace(/[-\s]+/g, "_");
  const mappedLabel = STATUS_LABELS[normalizedKey];

  if (mappedLabel) {
    return mappedLabel;
  }

  const normalized = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Unknown";
  }

  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTextTitle(value: React.ReactNode): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return undefined;
}

export function StatusIndicator({
  label,
  tone = "muted",
  status,
  statusClassName,
  withDot = true,
  compact = false,
  className,
  title,
  ...props
}: StatusIndicatorProps): React.JSX.Element {
  const normalizedStatus = normalizeStatusValue(status);

  const computedStatusClass =
    statusClassName ??
    (normalizedStatus ? `status-${normalizedStatus}` : toneClass[tone]);

  return (
    <span
      title={title ?? getTextTitle(label)}
      data-status={normalizedStatus ?? undefined}
      data-tone={tone}
      data-compact={compact ? "true" : undefined}
      className={cn(
        "status-indicator max-w-full",
        computedStatusClass,
        compact && "status-indicator-compact",
        className,
      )}
      {...props}
    >
      {withDot ? (
        <span className="status-dot shrink-0" aria-hidden="true" />
      ) : null}

      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

export type AutoStatusIndicatorProps = Omit<
  StatusIndicatorProps,
  "label" | "status"
> & {
  status: string | null | undefined;
  label?: React.ReactNode;
};

export function AutoStatusIndicator({
  status,
  label,
  ...props
}: AutoStatusIndicatorProps): React.JSX.Element {
  return (
    <StatusIndicator
      status={status}
      label={label ?? formatStatusLabel(status)}
      {...props}
    />
  );
}

export type RoomStatusIndicatorProps = Omit<AutoStatusIndicatorProps, "tone">;

export function RoomStatusIndicator({
  status,
  className,
  ...props
}: RoomStatusIndicatorProps): React.JSX.Element {
  return (
    <AutoStatusIndicator status={status} className={className} {...props} />
  );
}
