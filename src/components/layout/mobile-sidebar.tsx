// src/components/layout/mobile-sidebar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { AppNavItem } from "@/lib/navigation/app-nav";
import { NavIcon } from "@/components/layout/nav-icon";
import { LinkPendingIndicator } from "@/components/navigation/link-pending-indicator";
import { cn } from "@/lib/utils/cn";

type MobileSidebarProps = {
  primaryItems: AppNavItem[];
  adminItems: AppNavItem[];
  className?: string;
};

type ParsedMobileNavItem = AppNavItem & {
  targetPathname: string;
  targetSearchParams: URLSearchParams;
  hasSearchParams: boolean;
};

type CurrentLocation = {
  pathname: string;
  searchParams: URLSearchParams;
};

const FALLBACK_BASE_URL = "https://room-ops.local";

function parseNavItem(item: AppNavItem): ParsedMobileNavItem {
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
  item: ParsedMobileNavItem,
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

function formatBadgeCount(value: number): string {
  return value > 99 ? "99+" : String(value);
}

function MobileMenuIcon({ open }: { open: boolean }): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="relative block h-4 w-5"
      data-open={open ? "true" : "false"}
    >
      <span
        className={cn(
          "absolute left-0 top-0 h-[1.5px] w-5 origin-center rounded-[1px] bg-current transition duration-200 ease-out",
          open && "translate-y-[7px] rotate-45",
        )}
      />
      <span
        className={cn(
          "absolute left-0 top-[7px] h-[1.5px] w-5 rounded-[1px] bg-current transition duration-150 ease-out",
          open && "opacity-0",
        )}
      />
      <span
        className={cn(
          "absolute left-0 top-[14px] h-[1.5px] w-5 origin-center rounded-[1px] bg-current transition duration-200 ease-out",
          open && "-translate-y-[7px] -rotate-45",
        )}
      />
    </span>
  );
}

function MobileNavLink({
  item,
  current,
  onNavigate,
}: {
  item: ParsedMobileNavItem;
  current: CurrentLocation;
  onNavigate: () => void;
}): React.JSX.Element {
  const isActive = isActiveNavItem(item, current);

  return (
    <Link
      href={item.href}
      prefetch
      title={item.label}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive ? "true" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 px-3 text-sm font-semibold text-muted outline-none transition",
        "rounded-md hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand-500",
        isActive && "bg-brand-50 text-brand-700",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center border transition",
          "rounded-md",
          isActive
            ? "border-brand-500/25 bg-surface text-brand-700"
            : "border-border bg-surface text-muted",
        )}
      >
        <NavIcon icon={item.icon} />
      </span>

      <span className="min-w-0 flex-1 truncate">{item.label}</span>

      <LinkPendingIndicator />

      {typeof item.badgeCount === "number" && item.badgeCount > 0 ? (
        <span
          aria-label={`${item.badgeCount} unread notifications`}
          className="ml-auto inline-flex min-w-6 shrink-0 items-center justify-center rounded-full border border-danger-200 bg-danger-50 px-1.5 py-0.5 text-[11px] font-bold leading-none text-danger-700"
        >
          {formatBadgeCount(item.badgeCount)}
        </span>
      ) : null}
    </Link>
  );
}

function MobileNavSection({
  label,
  items,
  current,
  onNavigate,
}: {
  label?: string;
  items: ParsedMobileNavItem[];
  current: CurrentLocation;
  onNavigate: () => void;
}): React.JSX.Element | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={cn(label && "mt-4 border-t border-border pt-4")}>
      {label ? (
        <div className="mb-2 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          {label}
        </div>
      ) : null}

      <nav aria-label={label ?? "Main navigation"} className="grid gap-1">
        {items.map((item) => (
          <MobileNavLink
            key={getNavItemKey(item)}
            item={item}
            current={current}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </section>
  );
}

function EmptyMobileNavigationNotice(): React.JSX.Element {
  return (
    <div className="border border-border bg-surface-2 p-4 text-sm leading-6 text-muted">
      No navigation items are available for this role.
    </div>
  );
}

export function MobileSidebar({
  primaryItems,
  adminItems,
  className,
}: MobileSidebarProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const panelId = React.useId();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = React.useMemo<CurrentLocation>(
    () => ({
      pathname,
      searchParams: new URLSearchParams(searchParams.toString()),
    }),
    [pathname, searchParams],
  );

  const parsedPrimaryItems = React.useMemo(
    () => primaryItems.map(parseNavItem),
    [primaryItems],
  );

  const parsedAdminItems = React.useMemo(
    () => adminItems.map(parseNavItem),
    [adminItems],
  );

  const closeNavigation = React.useCallback(() => {
    setOpen(false);
  }, []);

  const toggleNavigation = React.useCallback(() => {
    setOpen((currentOpen) => !currentOpen);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className={cn("relative lg:hidden", className)}>
      <button
        type="button"
        onClick={toggleNavigation}
        className={cn(
          "inline-grid size-10 place-items-center border border-topbar-border bg-surface text-topbar-foreground shadow-xs transition",
          "rounded-md hover:border-brand-500/30 hover:bg-surface hover:text-brand-700",
          "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-canvas",
          open && "border-brand-500/35 bg-brand-50 text-brand-700",
        )}
        aria-label={open ? "Close navigation drawer" : "Open navigation drawer"}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="menu"
        data-open={open ? "true" : undefined}
      >
        <MobileMenuIcon open={open} />
      </button>

      {open ? (
        <div
          id={panelId}
          role="menu"
          className="dropdown-panel absolute left-0 top-12 z-[90] max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto p-2 shadow-command"
        >
          {parsedPrimaryItems.length > 0 ? (
            <MobileNavSection
              items={parsedPrimaryItems}
              current={current}
              onNavigate={closeNavigation}
            />
          ) : (
            <EmptyMobileNavigationNotice />
          )}

          <MobileNavSection
            label="Administration"
            items={parsedAdminItems}
            current={current}
            onNavigate={closeNavigation}
          />
        </div>
      ) : null}
    </div>
  );
}
