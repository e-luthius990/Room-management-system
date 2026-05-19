import * as React from "react";
import { cn } from "@/lib/utils/cn";

type EmptyStateSize = "sm" | "md" | "lg";
type EmptyStateAlign = "left" | "center";

export type EmptyStateProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "title"
> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  size?: EmptyStateSize;
  align?: EmptyStateAlign;
};

const sizeClass: Record<EmptyStateSize, string> = {
  sm: "p-5",
  md: "p-8",
  lg: "p-8 sm:p-10",
};

const iconSizeClass: Record<EmptyStateSize, string> = {
  sm: "mb-3 size-10 rounded-xl [&>svg]:size-4",
  md: "mb-4 size-11 rounded-2xl [&>svg]:size-5",
  lg: "mb-5 size-12 rounded-2xl [&>svg]:size-5",
};

const alignClass: Record<EmptyStateAlign, string> = {
  left: "text-left",
  center: "text-center",
};

const iconAlignClass: Record<EmptyStateAlign, string> = {
  left: "",
  center: "mx-auto",
};

const actionAlignClass: Record<EmptyStateAlign, string> = {
  left: "items-start justify-start sm:justify-start",
  center: "items-center justify-center sm:justify-center",
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  size = "md",
  align = "center",
  className,
  ...props
}: EmptyStateProps): React.JSX.Element {
  const hasActions = Boolean(action || secondaryAction);

  return (
    <div
      className={cn(
        "empty-state",
        sizeClass[size],
        alignClass[align],
        className,
      )}
      data-empty-state-size={size}
      data-empty-state-align={align}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className={cn(
            "flex items-center justify-center border border-border bg-surface text-muted shadow-xs",
            iconSizeClass[size],
            iconAlignClass[align],
          )}
        >
          {icon}
        </div>
      ) : null}

      <h3 className="empty-state-title">{title}</h3>

      {description ? (
        <p
          className={cn(
            "empty-state-text",
            align === "left" && "mx-0 max-w-xl",
          )}
        >
          {description}
        </p>
      ) : null}

      {hasActions ? (
        <div
          className={cn(
            "mt-5 flex flex-col gap-2 sm:flex-row sm:items-center",
            actionAlignClass[align],
          )}
        >
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
