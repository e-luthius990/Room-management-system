// src/components/layout/mobile-sidebar.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu } from "lucide-react";
import type { AppNavItem } from "@/lib/navigation/app-nav";
import { NavIcon } from "@/components/layout/nav-icon";
import { cn } from "@/lib/utils/cn";

type MobileSidebarProps = {
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

function MobileNavLink({
  item,
  pathname,
  searchParams,
  onNavigate,
}: {
  item: AppNavItem;
  pathname: string;
  searchParams: SearchParamsReader;
  onNavigate: () => void;
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
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted transition hover:bg-surface-2 hover:text-foreground",
        isActive && "bg-brand-50 text-brand-700",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl border",
          isActive
            ? "border-brand-500/25 bg-surface text-brand-700"
            : "border-border bg-surface text-muted",
        )}
      >
        <NavIcon icon={item.icon} />
      </span>

      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

function MobileNavSection({
  label,
  items,
  pathname,
  searchParams,
  onNavigate,
}: {
  label?: string;
  items: AppNavItem[];
  pathname: string;
  searchParams: SearchParamsReader;
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
            pathname={pathname}
            searchParams={searchParams}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
    </section>
  );
}

export function MobileSidebar({
  primaryItems,
  adminItems,
}: MobileSidebarProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
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

  function closeNavigation() {
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex size-10 items-center justify-center rounded-xl border border-topbar-border bg-surface/75 text-topbar-foreground shadow-xs backdrop-blur-xl transition hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-canvas"
        aria-label="Open navigation"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="dropdown-panel absolute left-0 top-12 z-[90] max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto p-2 shadow-floating"
        >
          {primaryItems.length > 0 ? (
            <MobileNavSection
              items={primaryItems}
              pathname={pathname}
              searchParams={searchParams}
              onNavigate={closeNavigation}
            />
          ) : (
            <div className="rounded-2xl border border-border bg-surface-2 p-4 text-sm leading-6 text-muted">
              No navigation items are available for this role.
            </div>
          )}

          <MobileNavSection
            label="Administration"
            items={adminItems}
            pathname={pathname}
            searchParams={searchParams}
            onNavigate={closeNavigation}
          />
        </div>
      ) : null}
    </div>
  );
}
