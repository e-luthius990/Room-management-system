"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { AppNavItem } from "@/lib/navigation/app-nav";
import { NavIcon } from "@/components/layout/nav-icon";
import { cn } from "@/lib/utils/cn";

type AppSidebarProps = {
  primaryItems: AppNavItem[];
  adminItems: AppNavItem[];
};

type ParsedHref = {
  pathname: string;
  searchParams: URLSearchParams;
};

type SearchParamsReader = {
  get(name: string): string | null;
};

function parseHref(href: string): ParsedHref {
  const parsed = new URL(href, "http://localhost");

  return {
    pathname: parsed.pathname,
    searchParams: parsed.searchParams,
  };
}

function hasMatchingSearchParams(
  currentSearchParams: SearchParamsReader,
  targetSearchParams: URLSearchParams,
): boolean {
  for (const [key, value] of targetSearchParams.entries()) {
    if (currentSearchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

function hasQueryParams(searchParams: URLSearchParams): boolean {
  return Array.from(searchParams.keys()).length > 0;
}

function isActivePath({
  pathname,
  searchParams,
  href,
  exact,
}: {
  pathname: string;
  searchParams: SearchParamsReader;
  href: string;
  exact?: boolean;
}): boolean {
  const target = parseHref(href);

  if (hasQueryParams(target.searchParams)) {
    return (
      pathname === target.pathname &&
      hasMatchingSearchParams(searchParams, target.searchParams)
    );
  }

  if (exact) {
    return pathname === target.pathname;
  }

  return (
    pathname === target.pathname || pathname.startsWith(`${target.pathname}/`)
  );
}

function getNavItemKey(item: AppNavItem): string {
  return `${item.label}:${item.href}`;
}

function SidebarNavLink({
  item,
  pathname,
  searchParams,
}: {
  item: AppNavItem;
  pathname: string;
  searchParams: SearchParamsReader;
}): React.JSX.Element {
  const isActive = isActivePath({
    pathname,
    searchParams,
    href: item.href,
    exact: item.exact,
  });

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={cn("nav-link group", isActive && "nav-link-active")}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl border transition",
          isActive
            ? "border-brand-500/25 bg-surface text-brand-700"
            : "border-transparent text-sidebar-muted group-hover:bg-surface/55 group-hover:text-sidebar-foreground",
        )}
      >
        <NavIcon icon={item.icon} />
      </span>

      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function SidebarSection({
  label,
  items,
  pathname,
  searchParams,
}: {
  label?: string;
  items: AppNavItem[];
  pathname: string;
  searchParams: SearchParamsReader;
}): React.JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={cn(label && "mt-6")}>
      {label ? <div className="sidebar-section-label">{label}</div> : null}

      <nav aria-label={label ?? "Main navigation"} className="space-y-1">
        {items.map((item) => (
          <SidebarNavLink
            key={getNavItemKey(item)}
            item={item}
            pathname={pathname}
            searchParams={searchParams}
          />
        ))}
      </nav>
    </section>
  );
}

function EmptyNavigationNotice(): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-sidebar-border bg-surface/55 p-4 text-sm leading-6 text-sidebar-muted shadow-xs">
      No navigation items are available for this role.
    </div>
  );
}

export function AppSidebar({
  primaryItems,
  adminItems,
}: AppSidebarProps): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <aside
      aria-label="Primary navigation"
      className="sidebar hidden h-dvh w-[17.5rem] shrink-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex"
    >
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="sidebar-brand shrink-0">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-2xl border border-sidebar-border bg-surface text-sm font-bold text-brand-700 shadow-xs"
            >
              CR
            </div>

            <div className="min-w-0">
              <div className="sidebar-brand-title truncate">CampRoomOps</div>
              <div className="sidebar-brand-subtitle truncate">
                Room operations console
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pr-2 scrollbar-thin">
          {primaryItems.length > 0 ? (
            <SidebarSection
              items={primaryItems}
              pathname={pathname}
              searchParams={searchParams}
            />
          ) : (
            <EmptyNavigationNotice />
          )}

          <SidebarSection
            label="Administration"
            items={adminItems}
            pathname={pathname}
            searchParams={searchParams}
          />
        </div>
      </div>
    </aside>
  );
}
