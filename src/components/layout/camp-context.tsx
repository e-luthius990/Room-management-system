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
    return "access assigned";
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
    return "All camps";
  }

  if (campAccess.length === 0) {
    return "No camp assigned";
  }

  if (campAccess.length === 1) {
    return normalizeText(campAccess[0]?.camp_name) ?? "Assigned camp";
  }

  return `${campAccess.length} camps`;
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

  return campAccess
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
  const title = getCampContextTitle(campAccess, isSystemActor);

  const isWarning = state === "missing";

  return (
    <div
      title={title}
      aria-label={`Current camp context: ${label}`}
      data-camp-context={state}
      className={cn(
        "inline-flex min-h-10 max-w-[min(13rem,46vw)] items-center gap-2 rounded-2xl border border-topbar-border bg-surface/55 px-3 shadow-xs backdrop-blur-xl",
        isWarning && "border-warning-700/25 bg-warning-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-2 shrink-0 rounded-full",
          state === "system" && "bg-brand-500",
          state === "assigned" && "bg-success-600",
          state === "multiple" && "bg-info-600",
          state === "missing" && "bg-warning-600",
        )}
      />

      <span
        className={cn(
          "min-w-0 truncate text-xs font-bold leading-5",
          isWarning ? "text-warning-700" : "text-topbar-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}
