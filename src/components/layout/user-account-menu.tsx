"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Settings, UserRound } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils/cn";

type UserAccountMenuProps = {
  fullName: string;
  email: string | null;
  roleName: string;
  className?: string;
};

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

export function UserAccountMenu({
  fullName,
  email,
  roleName,
  className,
}: UserAccountMenuProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const initials = getInitials(fullName);

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

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label="Open account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 cursor-pointer items-center gap-2 rounded-2xl border border-topbar-border bg-surface/65 px-2 py-1.5 shadow-xs backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-canvas"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-xs font-bold tracking-[-0.02em] text-white shadow-xs">
          {initials}
        </span>

        <span className="hidden min-w-0 text-left xl:block">
          <span className="block max-w-40 truncate text-sm font-semibold leading-5 text-topbar-foreground">
            {fullName}
          </span>

          <span className="block max-w-40 truncate text-xs leading-4 text-topbar-muted">
            {roleName}
          </span>
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="dropdown-panel absolute right-0 z-[80] mt-2 w-72 overflow-hidden p-0"
        >
          <div className="border-b border-border bg-surface-2 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-sm font-bold text-white shadow-xs">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold tracking-[-0.015em] text-foreground">
                  {fullName}
                </div>

                <div className="mt-0.5 truncate text-xs text-muted">
                  {email ?? "No email on profile"}
                </div>
              </div>
            </div>

            <div className="mt-4 inline-flex rounded-full border border-brand-600/20 bg-brand-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-700">
              {roleName}
            </div>
          </div>

          <div className="p-2">
            <Link
              href="/profile"
              role="menuitem"
              className="dropdown-item"
              onClick={() => setOpen(false)}
            >
              <UserRound className="size-4" aria-hidden="true" />
              <span>Profile</span>
            </Link>

            <Link
              href="/profile/settings"
              role="menuitem"
              className="dropdown-item"
              onClick={() => setOpen(false)}
            >
              <Settings className="size-4" aria-hidden="true" />
              <span>Account settings</span>
            </Link>
          </div>

          <form action={signOutAction} className="border-t border-border p-2">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-danger-700 transition hover:bg-danger-50 focus:outline-none focus:ring-2 focus:ring-danger-600/25"
            >
              <LogOut className="size-4" aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
