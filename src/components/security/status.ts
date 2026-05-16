import {
  clearanceStatusLabels,
  riskLevelLabels,
  type ClearanceStatus,
  type RiskLevel,
} from "@/lib/validation/security";

function formatFallbackLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeClearanceStatus(
  status: string | null,
): ClearanceStatus | null {
  if (
    status === "pending" ||
    status === "cleared" ||
    status === "watchlist" ||
    status === "denied" ||
    status === "suspended"
  ) {
    return status;
  }

  return null;
}

function normalizeRiskLevel(riskLevel: string | null): RiskLevel | null {
  if (
    riskLevel === "low" ||
    riskLevel === "normal" ||
    riskLevel === "elevated" ||
    riskLevel === "high" ||
    riskLevel === "critical"
  ) {
    return riskLevel;
  }

  return null;
}

export function formatClearanceStatus(status: string | null): string {
  const normalized = normalizeClearanceStatus(status);

  if (normalized) {
    return clearanceStatusLabels[normalized];
  }

  if (!status) {
    return clearanceStatusLabels.pending;
  }

  return formatFallbackLabel(status);
}

export function clearanceStatusTone(status: string | null): string {
  switch (normalizeClearanceStatus(status) ?? "pending") {
    case "cleared":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "watchlist":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "denied":
    case "suspended":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

export function formatRiskLevel(riskLevel: string | null): string {
  const normalized = normalizeRiskLevel(riskLevel);

  if (normalized) {
    return riskLevelLabels[normalized];
  }

  if (!riskLevel) {
    return riskLevelLabels.normal;
  }

  return formatFallbackLabel(riskLevel);
}

export function riskLevelTone(riskLevel: string | null): string {
  switch (normalizeRiskLevel(riskLevel) ?? "normal") {
    case "low":
    case "normal":
      return "border-neutral-200 bg-neutral-50 text-neutral-700";

    case "elevated":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "critical":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}