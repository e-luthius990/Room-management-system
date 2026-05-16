import type { CurrentCampAccess } from "@/lib/auth/types";
import { cn } from "@/lib/utils/cn";

type CampContextProps = {
  campAccess: CurrentCampAccess[];
  isSystemActor: boolean;
  className?: string;
};

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
    return campAccess[0]?.camp_name ?? "Assigned camp";
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
      const campName = access.camp_name ?? "Unnamed camp";
      return `${campName} (${access.access_level})`;
    })
    .join(", ");
}

export function CampContext({
  campAccess,
  isSystemActor,
  className,
}: CampContextProps): React.JSX.Element {
  const label = getCampContextLabel(campAccess, isSystemActor);
  const title = getCampContextTitle(campAccess, isSystemActor);
  const isWarning = !isSystemActor && campAccess.length === 0;

  return (
    <div
      title={title}
      aria-label={`Current camp: ${label}`}
      className={cn(
        "inline-flex min-h-10 max-w-[13rem] items-center rounded-2xl border border-topbar-border bg-surface/55 px-3 shadow-xs backdrop-blur-xl",
        isWarning && "border-warning-700/25 bg-warning-50 text-warning-700",
        className,
      )}
    >
      <span className="truncate text-xs font-bold leading-5 text-topbar-foreground">
        {label}
      </span>
    </div>
  );
}
