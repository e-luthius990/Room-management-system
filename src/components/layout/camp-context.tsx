// src/components/layout/camp-context.tsx
import type { JSX } from "react";
import type { CurrentCampAccess } from "@/lib/auth/types";
import { cn } from "@/lib/utils/cn";

type CampContextState = "system" | "assigned" | "multiple" | "missing";

type CampContextProps = {
  campAccess: CurrentCampAccess[];
  isSystemActor: boolean;
  className?: string;
};

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function formatAccessLevel(value: string | null | undefined): string {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "Access assigned";
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSortedCampAccess(
  campAccess: CurrentCampAccess[],
): CurrentCampAccess[] {
  return [...campAccess].sort((a, b) => {
    const aName = normalizeText(a.camp_name) ?? "";
    const bName = normalizeText(b.camp_name) ?? "";

    return aName.localeCompare(bName);
  });
}

function getPrimaryCampAccess(
  campAccess: CurrentCampAccess[],
): CurrentCampAccess | null {
  const sorted = getSortedCampAccess(campAccess);
  return sorted[0] ?? null;
}

function getCampContextState(
  campAccess: CurrentCampAccess[],
  isSystemActor: boolean,
): CampContextState {
  if (isSystemActor) {
    return "system";
  }

  if (campAccess.length === 0) {
    return "missing";
  }

  if (campAccess.length > 1) {
    return "multiple";
  }

  return "assigned";
}

function getCampContextLabel(
  campAccess: CurrentCampAccess[],
  isSystemActor: boolean,
): string {
  if (isSystemActor) {
    return "All Camps";
  }

  if (campAccess.length === 0) {
    return "No Camp Assigned";
  }

  const primaryCamp = getPrimaryCampAccess(campAccess);

  return normalizeText(primaryCamp?.camp_name) ?? "Assigned Camp";
}

function getCampContextMeta(
  campAccess: CurrentCampAccess[],
  isSystemActor: boolean,
): string {
  if (isSystemActor) {
    return "System Scope";
  }

  if (campAccess.length === 0) {
    return "Access Required";
  }

  if (campAccess.length === 1) {
    return formatAccessLevel(campAccess[0]?.access_level);
  }

  return `${campAccess.length} Camps Assigned`;
}

function getCampContextTitle(
  campAccess: CurrentCampAccess[],
  isSystemActor: boolean,
): string {
  if (isSystemActor) {
    return "System-level access across all camps";
  }

  if (campAccess.length === 0) {
    return "No camp access has been assigned";
  }

  return getSortedCampAccess(campAccess)
    .map((access) => {
      const campName = normalizeText(access.camp_name) ?? "Unnamed camp";
      const accessLevel = formatAccessLevel(access.access_level);

      return `${campName} · ${accessLevel}`;
    })
    .join(", ");
}

export function CampContext({
  campAccess,
  isSystemActor,
  className,
}: CampContextProps): JSX.Element {
  const state = getCampContextState(campAccess, isSystemActor);
  const label = getCampContextLabel(campAccess, isSystemActor);
  const meta = getCampContextMeta(campAccess, isSystemActor);
  const title = getCampContextTitle(campAccess, isSystemActor);

  const isWarning = state === "missing";
  const isMultiCampNonSystemUser = state === "multiple";

  return (
    <div
      title={title}
      aria-label={`Current camp context: ${label}. ${meta}.`}
      data-camp-context={state}
      data-multi-camp-user={isMultiCampNonSystemUser ? "true" : undefined}
      className={cn(
        "inline-flex min-h-10 max-w-[min(20rem,58vw)] items-center gap-2 border border-topbar-border bg-surface/55 px-3 shadow-xs backdrop-blur-xl",
        "rounded-md",
        isWarning && "border-warning-700/25 bg-warning-50",
        isMultiCampNonSystemUser && "border-info-600/25 bg-info-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0",
          "rounded-[2px]",
          state === "system" && "bg-brand-500",
          state === "assigned" && "bg-success-600",
          state === "multiple" && "bg-info-600",
          state === "missing" && "bg-warning-600",
        )}
      />

      <span className="min-w-0">
        <span
          className={cn(
            "block truncate text-xs font-bold leading-4",
            isWarning ? "text-warning-700" : "text-topbar-foreground",
          )}
        >
          {label}
        </span>

        <span
          className={cn(
            "block truncate text-[10px] font-bold uppercase leading-3 tracking-[0.12em]",
            isWarning ? "text-warning-700" : "text-topbar-muted",
          )}
        >
          {meta}
        </span>
      </span>
    </div>
  );
}
