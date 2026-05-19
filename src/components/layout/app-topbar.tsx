// src/components/layout/app-topbar.tsx
import type { JSX } from "react";
import type { CurrentCampAccess } from "@/lib/auth/types";
import type { AppNavItem } from "@/lib/navigation/app-nav";
import { CampContext } from "@/components/layout/camp-context";
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

  return (
    <header
      className={cn("topbar", className)}
      data-topbar="true"
      data-system-actor={isSystemActor ? "true" : undefined}
    >
      <div className="topbar-inner">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <MobileSidebar primaryItems={primaryItems} adminItems={adminItems} />

          <div className="min-w-0">
            <CampContext
              campAccess={campAccess}
              isSystemActor={isSystemActor}
            />
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
