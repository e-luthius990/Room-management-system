import type { ReactNode } from "react";
import type {
  ClearanceStatus,
  RiskLevel,
  SecurityVisitType,
} from "@/lib/validation/security";
import {
  clearanceStatusLabels,
  riskLevelLabels,
  securityVisitTypeLabels,
} from "@/lib/validation/security";
import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "critical" | "info";

type BadgeProps = {
  children: ReactNode;
  tone?: Tone;
  title?: string;
  className?: string;
};

const toneClasses: Record<Tone, string> = {
  neutral: "status-muted",
  success: "status-vacant-ready",
  warning: "status-reserved",
  danger: "status-under-maintenance",
  critical: "status-under-maintenance",
  info: "status-occupied",
};

export function SecurityBadge({
  children,
  tone = "neutral",
  title,
  className,
}: BadgeProps): React.JSX.Element {
  return (
    <span
      title={title}
      data-security-tone={tone}
      className={cn(
        "status-indicator status-indicator-compact max-w-full",
        toneClasses[tone],
        tone === "critical" &&
          "border-danger-600/40 bg-danger-50 text-danger-700",
        className,
      )}
    >
      <span className="status-dot shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

function getClearanceTone(status: string | null): Tone {
  switch (status) {
    case "cleared":
      return "success";

    case "pending":
      return "warning";

    case "watchlist":
      return "danger";

    case "denied":
    case "suspended":
      return "critical";

    default:
      return "neutral";
  }
}

function getRiskTone(riskLevel: string | null): Tone {
  switch (riskLevel) {
    case "low":
      return "success";

    case "normal":
      return "neutral";

    case "elevated":
      return "warning";

    case "high":
      return "danger";

    case "critical":
      return "critical";

    default:
      return "neutral";
  }
}

function getVisitTone(visitType: string | null): Tone {
  switch (visitType) {
    case "overnight_guest":
    case "delegate":
    case "vip":
      return "info";

    case "contractor":
    case "delivery":
      return "warning";

    case "day_visitor":
    case "staff_visit":
      return "neutral";

    default:
      return "neutral";
  }
}

function getClearanceLabel(status: string | null): string {
  if (status && status in clearanceStatusLabels) {
    return clearanceStatusLabels[status as ClearanceStatus];
  }

  return "Unknown";
}

function getRiskLabel(riskLevel: string | null): string {
  if (riskLevel && riskLevel in riskLevelLabels) {
    return riskLevelLabels[riskLevel as RiskLevel];
  }

  return "Unknown";
}

function getVisitLabel(visitType: string | null): string {
  if (visitType && visitType in securityVisitTypeLabels) {
    return securityVisitTypeLabels[visitType as SecurityVisitType];
  }

  return "Unspecified";
}

export function ClearanceStatusBadge({
  status,
}: {
  status: string | null;
}): React.JSX.Element {
  const label = getClearanceLabel(status);

  return (
    <SecurityBadge tone={getClearanceTone(status)} title={label}>
      {label}
    </SecurityBadge>
  );
}

export function RiskLevelBadge({
  riskLevel,
}: {
  riskLevel: string | null;
}): React.JSX.Element {
  const label = getRiskLabel(riskLevel);

  return (
    <SecurityBadge tone={getRiskTone(riskLevel)} title={label}>
      {label}
    </SecurityBadge>
  );
}

export function VisitTypeBadge({
  visitType,
}: {
  visitType: string | null;
}): React.JSX.Element {
  const label = getVisitLabel(visitType);

  return (
    <SecurityBadge tone={getVisitTone(visitType)} title={label}>
      {label}
    </SecurityBadge>
  );
}

export function PresenceBadge({
  isInside,
  isPendingReception,
}: {
  isInside: boolean;
  isPendingReception?: boolean;
}): React.JSX.Element {
  if (isPendingReception) {
    return (
      <SecurityBadge tone="info" title="Pending reception">
        Pending reception
      </SecurityBadge>
    );
  }

  if (isInside) {
    return (
      <SecurityBadge tone="success" title="Inside camp">
        Inside camp
      </SecurityBadge>
    );
  }

  return (
    <SecurityBadge tone="neutral" title="Not inside">
      Not inside
    </SecurityBadge>
  );
}
