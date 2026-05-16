import {
  BarChart3,
  Bed,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ConciergeBell,
  FileUp,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";
import type { AppNavIcon } from "@/lib/navigation/app-nav";

type NavIconProps = {
  icon: AppNavIcon;
  className?: string;
};

export function NavIcon({
  icon,
  className = "h-4 w-4",
}: NavIconProps): React.JSX.Element {
  switch (icon) {
    case "layout-dashboard":
      return <LayoutDashboard className={className} />;

    case "bed":
      return <Bed className={className} />;

    case "users":
      return <Users className={className} />;

    case "calendar-days":
      return <CalendarDays className={className} />;

    case "clipboard-check":
      return <ClipboardCheck className={className} />;

    case "concierge-bell":
      return <ConciergeBell className={className} />;

    case "sparkles":
      return <Sparkles className={className} />;

    case "wrench":
      return <Wrench className={className} />;

    case "bar-chart-3":
      return <BarChart3 className={className} />;

    case "shield-check":
      return <ShieldCheck className={className} />;

    case "settings":
      return <Settings className={className} />;

    case "user-cog":
      return <UserCog className={className} />;

    case "scroll-text":
      return <ScrollText className={className} />;

    case "file-up":
      return <FileUp className={className} />;

    case "building-2":
      return <Building2 className={className} />;

    default:
      return <LayoutDashboard className={className} />;
  }
}
