import * as React from "react";
import { cn } from "@/lib/utils/cn";

type EmptyStateSize = "sm" | "md" | "lg";

export type EmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  size?: EmptyStateSize;
};

const sizeClass: Record<EmptyStateSize, string> = {
  sm: "p-5",
  md: "p-8",
  lg: "p-8 sm:p-10",
};

const iconSizeClass: Record<EmptyStateSize, string> = {
  sm: "mb-3 size-10 rounded-xl",
  md: "mb-4 size-11 rounded-2xl",
  lg: "mb-5 size-12 rounded-2xl",
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  size = "md",
  className,
  ...props
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={cn("empty-state", sizeClass[size], className)} {...props}>
      {icon ? (
        <div
          aria-hidden="true"
          className={cn(
            "mx-auto flex items-center justify-center border border-border bg-surface text-muted shadow-xs",
            iconSizeClass[size],
          )}
        >
          {icon}
        </div>
      ) : null}

      <h3 className="empty-state-title">{title}</h3>

      {description ? <p className="empty-state-text">{description}</p> : null}

      {action || secondaryAction ? (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
