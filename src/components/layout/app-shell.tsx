import type { ReactNode } from "react";
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

const containerClass: Record<AppShellContainer, string> = {
  default: "app-container",
  wide: "app-container-wide",
  fluid: "w-full",
};

function getUserDisplayName(currentUser: CurrentUserContext): string {
  const profileName = currentUser.profile.full_name?.trim();

  if (profileName) {
    return profileName;
  }

  const authEmail = currentUser.authUser.email?.trim();

  if (authEmail) {
    return authEmail;
  }

  return "User";
}

function getUserEmail(currentUser: CurrentUserContext): string | null {
  const profileEmail = currentUser.profile.email?.trim();

  if (profileEmail) {
    return profileEmail;
  }

  const authEmail = currentUser.authUser.email?.trim();

  return authEmail || null;
}

export function AppShell({
  currentUser,
  children,
  container = "default",
  className,
  mainClassName,
  contentClassName,
}: AppShellProps): React.JSX.Element {
  const primaryItems = getVisibleNavItems(currentUser);
  const adminItems = getVisibleAdminNavItems(currentUser);

  const fullName = getUserDisplayName(currentUser);
  const email = getUserEmail(currentUser);

  return (
    <div className={cn("app-shell", className)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-background focus:shadow-floating"
      >
        Skip to main content
      </a>

      <div className="min-h-dvh w-full overflow-x-hidden">
        <AppSidebar primaryItems={primaryItems} adminItems={adminItems} />

        <div className="relative flex min-h-dvh min-w-0 flex-col lg:pl-[17.5rem]">
          <AppTopbar
            primaryItems={primaryItems}
            adminItems={adminItems}
            fullName={fullName}
            email={email}
            roleName={currentUser.role.name}
            campAccess={currentUser.campAccess}
            isSystemActor={currentUser.isSystemActor}
          />

          <main
            id="main-content"
            tabIndex={-1}
            className={cn("app-main focus:outline-none", mainClassName)}
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
