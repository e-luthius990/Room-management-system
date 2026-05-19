import type { JSX, ReactNode } from "react";
import type { CurrentUserContext } from "@/lib/auth/types";
import {
  getVisibleAdminNavItems,
  getVisibleNavItems,
} from "@/lib/navigation/app-nav";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { cn } from "@/lib/utils/cn";

type AppShellContainer = "default" | "wide" | "fluid";

type AppShellProps = {
  currentUser: CurrentUserContext;
  children: ReactNode;
  container?: AppShellContainer;
  className?: string;
  mainClassName?: string;
  contentClassName?: string;
};

const DESKTOP_SIDEBAR_OFFSET_CLASS = "lg:pl-[17.5rem]";

const containerClass: Record<AppShellContainer, string> = {
  default: "app-container",
  wide: "app-container-wide",
  fluid: "w-full",
};

function getTrimmedValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function getUserDisplayName(currentUser: CurrentUserContext): string {
  return (
    getTrimmedValue(currentUser.profile.full_name) ??
    getTrimmedValue(currentUser.profile.email) ??
    getTrimmedValue(currentUser.authUser.email) ??
    "User"
  );
}

function getUserEmail(currentUser: CurrentUserContext): string | null {
  return (
    getTrimmedValue(currentUser.profile.email) ??
    getTrimmedValue(currentUser.authUser.email)
  );
}

function getRoleName(currentUser: CurrentUserContext): string {
  return (
    getTrimmedValue(currentUser.role.name) ??
    getTrimmedValue(currentUser.role.key) ??
    "System user"
  );
}

export function AppShell({
  currentUser,
  children,
  container = "default",
  className,
  mainClassName,
  contentClassName,
}: AppShellProps): JSX.Element {
  const primaryItems = getVisibleNavItems(currentUser);
  const adminItems = getVisibleAdminNavItems(currentUser);

  const fullName = getUserDisplayName(currentUser);
  const email = getUserEmail(currentUser);
  const roleName = getRoleName(currentUser);

  return (
    <div
      className={cn("app-shell", className)}
      data-app-shell="true"
      data-container={container}
      data-role={currentUser.role.key}
      data-system-actor={currentUser.isSystemActor ? "true" : undefined}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-background focus:shadow-floating"
      >
        Skip to main content
      </a>

      <div className="min-h-dvh w-full overflow-x-hidden">
        <AppSidebar primaryItems={primaryItems} adminItems={adminItems} />

        <div
          className={cn(
            "relative flex min-h-dvh min-w-0 flex-col",
            DESKTOP_SIDEBAR_OFFSET_CLASS,
          )}
        >
          <AppTopbar
            primaryItems={primaryItems}
            adminItems={adminItems}
            fullName={fullName}
            email={email}
            roleName={roleName}
            campAccess={currentUser.campAccess}
            isSystemActor={currentUser.isSystemActor}
          />

          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              "app-main scroll-mt-20 focus:outline-none",
              mainClassName,
            )}
          >
            <div
              className={cn(
                containerClass[container],
                "page-stack",
                contentClassName,
              )}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
