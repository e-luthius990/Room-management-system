// src/components/layout/nav-icon.tsx

import type { JSX } from "react";
import {
  BarChart3,
  Bed,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileDown,
  FileUp,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { AppNavIcon } from "@/lib/navigation/app-nav";
import { cn } from "@/lib/utils/cn";

type NavIconProps = {
  icon: AppNavIcon;
  className?: string;
};

const NAV_ICON_REGISTRY = {
  "layout-dashboard": LayoutDashboard,
  bed: Bed,
  users: Users,
  "calendar-days": CalendarDays,
  "clipboard-check": ClipboardCheck,
  "bar-chart-3": BarChart3,
  "shield-check": ShieldCheck,
  settings: Settings,
  "user-cog": UserCog,
  "scroll-text": ScrollText,
  "file-up": FileUp,
  "file-down": FileDown,
  "building-2": Building2,
} satisfies Record<AppNavIcon, LucideIcon>;

export function NavIcon({ icon, className }: NavIconProps): JSX.Element {
  const Icon = NAV_ICON_REGISTRY[icon];

  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      className={cn("size-4 shrink-0", className)}
      strokeWidth={2}
    />
  );
}
