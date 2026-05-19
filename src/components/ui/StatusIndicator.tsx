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
};

const toneClass: Record<StatusTone, string> = {
  success: "status-vacant-ready",
  info: "status-occupied",
  warning: "status-reserved",
  danger: "status-under-maintenance",
  brand: "status-needs-cleaning",
  muted: "status-muted",
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
      className={cn(
        "status-indicator max-w-full",
        computedStatusClass,
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
