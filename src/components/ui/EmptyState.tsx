import * as React from "react";
import { cn } from "@/lib/utils/cn";

type EmptyStateSize = "sm" | "md" | "lg";
type EmptyStateAlign = "left" | "center";
type EmptyStateTone = "neutral" | "success" | "warning" | "danger" | "info";

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
  tone?: EmptyStateTone;
  operational?: boolean;
};

const sizeClass: Record<EmptyStateSize, string> = {
  sm: "p-5",
  md: "p-8",
  lg: "p-8 sm:p-10",
};

const operationalSizeClass: Record<EmptyStateSize, string> = {
  sm: "px-3 py-2.5",
  md: "px-4 py-3",
  lg: "px-4 py-4",
};

const iconSizeClass: Record<EmptyStateSize, string> = {
  sm: "mb-3 size-10 rounded-md [&>svg]:size-4",
  md: "mb-4 size-11 rounded-md [&>svg]:size-5",
  lg: "mb-5 size-12 rounded-lg [&>svg]:size-5",
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

const toneClass: Record<EmptyStateTone, string> = {
  neutral: "empty-state-neutral",
  success: "empty-state-success",
  warning: "empty-state-warning",
  danger: "empty-state-danger",
  info: "empty-state-info",
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  size = "md",
  align = "center",
  tone = "neutral",
  operational = false,
  className,
  ...props
}: EmptyStateProps): React.JSX.Element {
  const hasActions = Boolean(action || secondaryAction);

  return (
    <div
      className={cn(
        "empty-state",
        toneClass[tone],
        operational ? "empty-state-operational" : sizeClass[size],
        operational && operationalSizeClass[size],
        alignClass[align],
        className,
      )}
      data-empty-state-size={size}
      data-empty-state-align={align}
      data-empty-state-tone={tone}
      data-operational={operational ? "true" : undefined}
      {...props}
    >
      {icon ? (
        <div
          aria-hidden="true"
          className={cn(
            "empty-state-icon",
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
            operational && "mt-1 max-w-none",
          )}
        >
          {description}
        </p>
      ) : null}

      {hasActions ? (
        <div
          className={cn(
            operational ? "mt-3" : "mt-5",
            "flex flex-col gap-2 sm:flex-row sm:items-center",
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
