import * as React from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "success"
  | "warning";

type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const variantClass: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
  success: "btn-success",
  warning: "btn-warning",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      loadingText,
      disabled = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      type = "button",
      "aria-label": ariaLabel,
      onClick,
      ...props
    },
    ref,
  ): React.JSX.Element {
    const isDisabled = disabled || loading;
    const hasVisibleText =
      React.Children.count(children) > 0 || Boolean(loadingText);

    if (
      process.env.NODE_ENV !== "production" &&
      !hasVisibleText &&
      !ariaLabel
    ) {
      console.warn(
        "Icon-only Button requires an aria-label for accessibility.",
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        aria-busy={loading || undefined}
        aria-label={ariaLabel}
        data-variant={variant}
        data-size={size}
        data-loading={loading ? "true" : undefined}
        className={cn(
          variantClass[variant],
          sizeClass[size],
          "min-w-0",
          fullWidth && "w-full",
          className,
        )}
        onClick={isDisabled ? undefined : onClick}
        {...props}
      >
        {loading ? (
          <span aria-hidden="true" className="inline-spinner shrink-0" />
        ) : leftIcon ? (
          <span aria-hidden="true" className="shrink-0">
            {leftIcon}
          </span>
        ) : null}

        {loading && loadingText ? (
          <span className="min-w-0 truncate opacity-85">{loadingText}</span>
        ) : children ? (
          <span className="min-w-0 truncate">{children}</span>
        ) : null}

        {!loading && rightIcon ? (
          <span aria-hidden="true" className="shrink-0">
            {rightIcon}
          </span>
        ) : null}
      </button>
    );
  },
);

Button.displayName = "Button";
