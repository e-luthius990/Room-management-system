import * as React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type StatTone = "default" | "success" | "warning" | "danger" | "info" | "brand";

type StatTrend = {
  label: string;
  direction?: "up" | "down" | "flat";
};

export type StatCardProps = React.HTMLAttributes<HTMLElement> & {
  label: string;
  value: string | number;
  note?: string;
  icon?: React.ReactNode;
  tone?: StatTone;
  trend?: StatTrend;
  as?: "section" | "article" | "div";
};

const toneClass: Record<StatTone, string> = {
  default: "",
  success: "border-success-600/25 bg-success-50/45",
  warning: "border-warning-700/25 bg-warning-50/55",
  danger: "border-danger-600/25 bg-danger-50/50",
  info: "border-info-600/25 bg-info-50/50",
  brand: "border-brand-600/25 bg-brand-50/50",
};

const trendClass: Record<NonNullable<StatTrend["direction"]>, string> = {
  up: "stat-trend-up",
  down: "stat-trend-down",
  flat: "border-border bg-surface-2 text-muted",
};

const trendIcon: Record<NonNullable<StatTrend["direction"]>, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

function TrendBadge({ trend }: { trend: StatTrend }): React.JSX.Element {
  const direction = trend.direction ?? "flat";
  const Icon = trendIcon[direction];

  return (
    <span className={cn("stat-trend", trendClass[direction])}>
      <Icon className="size-3.5" aria-hidden="true" />
      <span>{trend.label}</span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  note,
  icon,
  tone = "default",
  trend,
  className,
  as = "section",
  ...props
}: StatCardProps): React.JSX.Element {
  const Component = as;

  return (
    <Component
      className={cn("stat-card", toneClass[tone], className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="stat-label">{label}</p>
          <div className="stat-value">{value}</div>
        </div>

        {icon ? (
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface/75 text-muted shadow-xs"
          >
            {icon}
          </div>
        ) : null}
      </div>

      {note || trend ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          {note ? <p className="stat-note">{note}</p> : <span />}

          {trend ? <TrendBadge trend={trend} /> : null}
        </div>
      ) : null}
    </Component>
  );
}
