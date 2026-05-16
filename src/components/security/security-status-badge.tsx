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
  neutral: "border-border bg-surface-2 text-muted",
  success: "border-success-600/25 bg-success-50 text-success-700",
  warning: "border-warning-700/25 bg-warning-50 text-warning-700",
  danger: "border-danger-600/25 bg-danger-50 text-danger-700",
  critical: "border-danger-600/35 bg-danger-50 text-danger-700",
  info: "border-info-600/25 bg-info-50 text-info-700",
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
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {children}
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
  return (
    <SecurityBadge tone={getClearanceTone(status)}>
      {getClearanceLabel(status)}
    </SecurityBadge>
  );
}

export function RiskLevelBadge({
  riskLevel,
}: {
  riskLevel: string | null;
}): React.JSX.Element {
  return (
    <SecurityBadge tone={getRiskTone(riskLevel)}>
      {getRiskLabel(riskLevel)}
    </SecurityBadge>
  );
}

export function VisitTypeBadge({
  visitType,
}: {
  visitType: string | null;
}): React.JSX.Element {
  return (
    <SecurityBadge tone={getVisitTone(visitType)}>
      {getVisitLabel(visitType)}
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
    return <SecurityBadge tone="info">Pending reception</SecurityBadge>;
  }

  if (isInside) {
    return <SecurityBadge tone="success">Inside camp</SecurityBadge>;
  }

  return <SecurityBadge tone="neutral">Not inside</SecurityBadge>;
}
