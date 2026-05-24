// src/components/layout/user-account-menu.tsx
"use client";

import * as React from "react";
import type { JSX } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { LogOut, Settings, UserRound } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";

type UserAccountMenuProps = {
  fullName: string;
  email: string | null;
  roleName: string;
  profileHref?: string;
  settingsHref?: string;
  className?: string;
};

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0]?.slice(0, 1).toUpperCase() ?? "U";
  }

  return `${parts[0]?.slice(0, 1) ?? ""}${
    parts[1]?.slice(0, 1) ?? ""
  }`.toUpperCase();
}

function SignOutButton(): JSX.Element {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-danger-700 outline-none transition",
        "rounded-md hover:bg-danger-50 focus-visible:ring-2 focus-visible:ring-danger-600/25",
        "disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      {pending ? (
        <span className="inline-spinner size-4 shrink-0" aria-hidden="true" />
      ) : (
        <LogOut className="size-4 shrink-0" aria-hidden="true" />
      )}

      <span>{pending ? "Signing out..." : "Sign out"}</span>
    </button>
  );
}

export function UserAccountMenu({
  fullName,
  email,
  roleName,
  profileHref = "/profile",
  settingsHref = "/profile/settings",
  className,
}: UserAccountMenuProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const panelId = React.useId();

  const displayName = normalizeText(fullName) ?? "User";
  const displayEmail = normalizeText(email);
  const displayRoleName = normalizeText(roleName) ?? "System user";

  const initials = React.useMemo(() => getInitials(displayName), [displayName]);

  const closeMenu = React.useCallback(() => {
    setOpen(false);
  }, []);

  const toggleMenu = React.useCallback(() => {
    setOpen((current) => !current);
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
        buttonRef.current?.focus();
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
    <div
      ref={menuRef}
      className={cn("relative", className)}
      data-account-menu-open={open ? "true" : undefined}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={open ? "Close account menu" : "Open account menu"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggleMenu}
        className={cn(
          "flex min-h-10 cursor-pointer items-center gap-2 border border-topbar-border bg-surface/65 px-2 py-1.5 shadow-xs backdrop-blur-xl outline-none transition",
          "rounded-md hover:bg-surface focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-700 text-xs font-bold tracking-[-0.02em] text-white shadow-xs">
          {initials}
        </span>

        <span className="hidden min-w-0 text-left xl:block">
          <span
            className="block max-w-40 truncate text-sm font-semibold leading-5 text-topbar-foreground"
            title={displayName}
          >
            {displayName}
          </span>

          <span
            className="block max-w-40 truncate text-xs leading-4 text-topbar-muted"
            title={displayRoleName}
          >
            {displayRoleName}
          </span>
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="menu"
          className="dropdown-panel absolute right-0 z-[80] mt-2 w-72 overflow-hidden p-0"
        >
          <div className="border-b border-border bg-surface-2 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-700 text-sm font-bold text-white shadow-xs">
                {initials}
              </div>

              <div className="min-w-0">
                <div
                  className="truncate text-sm font-semibold tracking-[-0.015em] text-foreground"
                  title={displayName}
                >
                  {displayName}
                </div>

                <div
                  className="mt-0.5 truncate text-xs text-muted"
                  title={displayEmail ?? undefined}
                >
                  {displayEmail ?? "No email on profile"}
                </div>
              </div>
            </div>

            <div className="mt-4 inline-flex max-w-full rounded-sm border border-brand-600/20 bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700">
              <span className="truncate" title={displayRoleName}>
                {displayRoleName}
              </span>
            </div>
          </div>

          <div className="p-2">
            <Link
              href={profileHref}
              role="menuitem"
              className="dropdown-item"
              onClick={closeMenu}
            >
              <UserRound className="size-4 shrink-0" aria-hidden="true" />
              <span>Profile</span>
            </Link>

            <Link
              href={settingsHref}
              role="menuitem"
              className="dropdown-item"
              onClick={closeMenu}
            >
              <Settings className="size-4 shrink-0" aria-hidden="true" />
              <span>Account settings</span>
            </Link>
          </div>

          <form
            action={signOutAction}
            onSubmit={closeMenu}
            className="border-t border-border p-2"
          >
            <SignOutButton />
          </form>
        </div>
      ) : null}
    </div>
  );
}
