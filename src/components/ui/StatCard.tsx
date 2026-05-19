import * as React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type StatTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "brand";

export type StatTrend = {
  label: React.ReactNode;
  direction?: "up" | "down" | "flat";
  tone?: "neutral" | "positive" | "negative" | "warning";
};

export type StatCardProps = Omit<React.HTMLAttributes<HTMLElement>, "title"> & {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
  trend?: StatTrend;
  as?: "section" | "article" | "div";
};

const toneClass: Record<StatTone, string> = {
  default: "",
  success: "stat-card-success",
  warning: "stat-card-warning",
  danger: "stat-card-danger",
  info: "stat-card-info",
  brand: "stat-card-brand",
};

const trendToneClass: Record<NonNullable<StatTrend["tone"]>, string> = {
  neutral: "border-border bg-surface-2 text-muted",
  positive: "stat-trend-up",
  negative: "stat-trend-down",
  warning: "border-warning-700/25 bg-warning-50 text-warning-700",
};

const trendIcon: Record<NonNullable<StatTrend["direction"]>, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Minus,
};

function TrendBadge({ trend }: { trend: StatTrend }): React.JSX.Element {
  const direction = trend.direction ?? "flat";
  const tone = trend.tone ?? "neutral";
  const Icon = trendIcon[direction];

  return (
    <span
      className={cn("stat-trend shrink-0", trendToneClass[tone])}
      data-trend-direction={direction}
      data-trend-tone={tone}
    >
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
  const hasFooter = Boolean(note || trend);

  return (
    <Component
      className={cn("stat-card", toneClass[tone], className)}
      data-stat-tone={tone}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="stat-label">{label}</p>
          <div className="stat-value">{value}</div>
        </div>

        {icon ? (
          <div aria-hidden="true" className="stat-icon">
            {icon}
          </div>
        ) : null}
      </div>

      {hasFooter ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          {note ? <p className="stat-note min-w-0">{note}</p> : <span />}

          {trend ? <TrendBadge trend={trend} /> : null}
        </div>
      ) : null}
    </Component>
  );
}
