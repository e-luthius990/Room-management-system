import type { CurrentCampAccess } from "@/lib/auth/types";
import { CampContext } from "@/components/layout/camp-context";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { UserAccountMenu } from "@/components/layout/user-account-menu";
import type { AppNavItem } from "@/lib/navigation/app-nav";
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

export function AppTopbar({
  primaryItems,
  adminItems,
  fullName,
  email,
  roleName,
  campAccess,
  isSystemActor,
  className,
}: AppTopbarProps): React.JSX.Element {
  return (
    <header className={cn("topbar", className)}>
      <div className="topbar-inner">
        <div className="flex min-w-0 items-center gap-3">
          <MobileSidebar primaryItems={primaryItems} adminItems={adminItems} />

          <CampContext campAccess={campAccess} isSystemActor={isSystemActor} />
        </div>

        <div className="flex shrink-0 items-center">
          <UserAccountMenu
            fullName={fullName}
            email={email}
            roleName={roleName}
          />
        </div>
      </div>
    </header>
  );
}
