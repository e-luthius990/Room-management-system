// src/components/layout/app-topbar.tsx
import type { JSX } from "react";

import type { CurrentCampAccess } from "@/lib/auth/types";
import type { AppNavItem } from "@/lib/navigation/app-nav";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { UserAccountMenu } from "@/components/layout/user-account-menu";
import { cn } from "@/lib/utils/cn";

type AppTopbarProps = {
  primaryItems: AppNavItem[];
  adminItems: AppNavItem[];
  fullName: string;
  email: string | null;
  roleName: string;
  campAccess: CurrentCampAccess[];
  isSystemActor: boolean;
  className?: string;
};

function normalizeDisplayValue(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function getCampName(access: CurrentCampAccess): string | null {
  const record = access as unknown as Record<string, unknown>;

  const candidates = [
    record.camp_name,
    record.campName,
    record.name,
    record.camp,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = normalizeDisplayValue(candidate);

      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
}

function getCampDisplayName({
  campAccess,
  isSystemActor,
}: {
  campAccess: CurrentCampAccess[];
  isSystemActor: boolean;
}): string {
  if (isSystemActor) {
    return "All camps";
  }

  const firstCamp = campAccess
    .map(getCampName)
    .find((campName): campName is string => Boolean(campName));

  return firstCamp ?? "No camp selected";
}

export function AppTopbar({
  primaryItems,
  adminItems,
  fullName,
  email,
  roleName,
  campAccess,
  isSystemActor,
  className,
}: AppTopbarProps): JSX.Element {
  const displayName = normalizeDisplayValue(fullName) ?? "User";
  const displayEmail = normalizeDisplayValue(email);
  const displayRoleName = normalizeDisplayValue(roleName) ?? "System user";

  const campName = getCampDisplayName({
    campAccess,
    isSystemActor,
  });

  return (
    <header
      className={cn("topbar", className)}
      data-topbar="true"
      data-system-actor={isSystemActor ? "true" : undefined}
    >
      <div className="topbar-inner">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MobileSidebar primaryItems={primaryItems} adminItems={adminItems} />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-5 text-foreground">
              {campName}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <UserAccountMenu
            fullName={displayName}
            email={displayEmail}
            roleName={displayRoleName}
          />
        </div>
      </div>
    </header>
  );
}
