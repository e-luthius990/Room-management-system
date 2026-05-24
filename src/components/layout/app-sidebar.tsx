// src/components/layout/app-sidebar.tsx
"use client";

import type { JSX, ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { AppNavItem } from "@/lib/navigation/app-nav";
import { NavIcon } from "@/components/layout/nav-icon";
import { cn } from "@/lib/utils/cn";

type AppSidebarProps = {
  primaryItems: AppNavItem[];
  adminItems: AppNavItem[];
  brandName?: string;
  brandSubtitle?: string;
  brandMark?: ReactNode;
  className?: string;
};

type ParsedNavItem = AppNavItem & {
  targetPathname: string;
  targetSearchParams: URLSearchParams;
  hasSearchParams: boolean;
};

type CurrentLocation = {
  pathname: string;
  searchParams: URLSearchParams;
};

const SIDEBAR_WIDTH_CLASS = "w-[17.5rem]";
const FALLBACK_BASE_URL = "https://room-ops.local";

function parseNavItem(item: AppNavItem): ParsedNavItem {
  try {
    const url = new URL(item.href, FALLBACK_BASE_URL);

    return {
      ...item,
      targetPathname: url.pathname || "/",
      targetSearchParams: url.searchParams,
      hasSearchParams: url.searchParams.size > 0,
    };
  } catch {
    return {
      ...item,
      targetPathname: "/",
      targetSearchParams: new URLSearchParams(),
      hasSearchParams: false,
    };
  }
}

function hasMatchingSearchParams(
  currentSearchParams: URLSearchParams,
  targetSearchParams: URLSearchParams,
): boolean {
  for (const [key, value] of targetSearchParams.entries()) {
    if (currentSearchParams.get(key) !== value) {
      return false;
    }
  }

  return true;
}

function isPathActive(
  currentPathname: string,
  targetPathname: string,
): boolean {
  if (targetPathname === "/") {
    return currentPathname === "/";
  }

  return (
    currentPathname === targetPathname ||
    currentPathname.startsWith(`${targetPathname}/`)
  );
}

function isActiveNavItem(
  item: ParsedNavItem,
  current: CurrentLocation,
): boolean {
  if (item.hasSearchParams) {
    return (
      current.pathname === item.targetPathname &&
      hasMatchingSearchParams(current.searchParams, item.targetSearchParams)
    );
  }

  if (item.exact) {
    return current.pathname === item.targetPathname;
  }

  return isPathActive(current.pathname, item.targetPathname);
}

function getNavItemKey(item: AppNavItem): string {
  return `${item.label}:${item.href}`;
}

function SidebarNavLink({
  item,
  current,
}: {
  item: ParsedNavItem;
  current: CurrentLocation;
}): JSX.Element {
  const isActive = isActiveNavItem(item, current);

  return (
    <Link
      href={item.href}
      prefetch
      aria-current={isActive ? "page" : undefined}
      title={item.label}
      data-active={isActive ? "true" : undefined}
      className={cn("nav-link group", isActive && "nav-link-active")}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center border transition",
          "rounded-md",
          isActive
            ? "border-brand-500/25 bg-surface text-brand-700"
            : "border-transparent text-sidebar-muted group-hover:border-sidebar-border group-hover:bg-surface/55 group-hover:text-sidebar-foreground",
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
  current,
}: {
  label?: string;
  items: ParsedNavItem[];
  current: CurrentLocation;
}): JSX.Element | null {
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
            current={current}
          />
        ))}
      </nav>
    </section>
  );
}

function EmptyNavigationNotice(): JSX.Element {
  return (
    <div className="border border-sidebar-border bg-surface/55 p-4 text-sm leading-6 text-sidebar-muted shadow-xs">
      No navigation items are available for this role.
    </div>
  );
}

function DefaultBrandMark(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="flex size-10 items-center justify-center border border-sidebar-border bg-surface text-sm font-bold text-brand-700 shadow-xs"
    >
      CR
    </div>
  );
}

export function AppSidebar({
  primaryItems,
  adminItems,
  brandName = "CampRoomOps",
  brandSubtitle = "Room operations console",
  brandMark,
  className,
}: AppSidebarProps): JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = useMemo<CurrentLocation>(
    () => ({
      pathname,
      searchParams: new URLSearchParams(searchParams.toString()),
    }),
    [pathname, searchParams],
  );

  const parsedPrimaryItems = useMemo(
    () => primaryItems.map(parseNavItem),
    [primaryItems],
  );

  const parsedAdminItems = useMemo(
    () => adminItems.map(parseNavItem),
    [adminItems],
  );

  return (
    <aside
      aria-label="Primary navigation"
      className={cn(
        "sidebar hidden h-dvh shrink-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex",
        SIDEBAR_WIDTH_CLASS,
        className,
      )}
    >
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="sidebar-brand shrink-0">
          <div className="flex items-center gap-3">
            {brandMark ?? <DefaultBrandMark />}

            <div className="min-w-0">
              <div className="sidebar-brand-title truncate" title={brandName}>
                {brandName}
              </div>
              <div
                className="sidebar-brand-subtitle truncate"
                title={brandSubtitle}
              >
                {brandSubtitle}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pr-2">
          {parsedPrimaryItems.length > 0 ? (
            <SidebarSection items={parsedPrimaryItems} current={current} />
          ) : (
            <EmptyNavigationNotice />
          )}

          <SidebarSection
            label="Administration"
            items={parsedAdminItems}
            current={current}
          />
        </div>
      </div>
    </aside>
  );
}
