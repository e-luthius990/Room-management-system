import * as React from "react";
import { cn } from "@/lib/utils/cn";

type StatusTone = "success" | "info" | "warning" | "danger" | "brand" | "muted";

export type StatusIndicatorProps = React.HTMLAttributes<HTMLSpanElement> & {
  label: string;
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

export function normalizeStatusClass(
  status: string | null | undefined,
): string {
  if (!status) {
    return "status-muted";
  }

  return `status-${status.trim().toLowerCase().replaceAll("_", "-").replaceAll(" ", "-")}`;
}

export function formatStatusLabel(status: string | null | undefined): string {
  if (!status) {
    return "Unknown";
  }

  return status
    .trim()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function StatusIndicator({
  label,
  tone = "muted",
  status,
  statusClassName,
  withDot = true,
  className,
  ...props
}: StatusIndicatorProps): React.JSX.Element {
  const computedStatusClass =
    statusClassName ??
    (status ? normalizeStatusClass(status) : toneClass[tone]);

  return (
    <span
      className={cn("status-indicator", computedStatusClass, className)}
      {...props}
    >
      {withDot ? <span className="status-dot" aria-hidden="true" /> : null}
      <span>{label}</span>
    </span>
  );
}

export type AutoStatusIndicatorProps = Omit<
  StatusIndicatorProps,
  "label" | "status"
> & {
  status: string | null | undefined;
  label?: string;
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

export function RoomStatusIndicator({
  status,
  className,
}: {
  status: string | null | undefined;
  className?: string;
}): React.JSX.Element {
  return <AutoStatusIndicator status={status} className={className} />;
}
