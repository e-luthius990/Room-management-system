import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      className,
      wrapperClassName,
      label,
      hint,
      error,
      id,
      name,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref,
  ) {
    const reactId = React.useId();
    const inputId = id ?? name ?? reactId;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = errorId ?? hintId;

    const hasLeftIcon = Boolean(leftIcon);
    const hasRightIcon = Boolean(rightIcon);
    const hasError = Boolean(error);

    return (
      <div className={cn("field-group", wrapperClassName)}>
        {label ? (
          <label htmlFor={inputId} className="field-label">
            {label}
          </label>
        ) : null}

        <div className="relative">
          {hasLeftIcon ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-muted"
            >
              {leftIcon}
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            name={name}
            disabled={disabled}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              "input",
              hasLeftIcon ? "pl-10" : undefined,
              hasRightIcon ? "pr-10" : undefined,
              hasError
                ? "border-danger-600 focus:border-danger-600 focus:ring-danger-600/20"
                : undefined,
              className,
            )}
            {...props}
          />

          {hasRightIcon ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-muted"
            >
              {rightIcon}
            </span>
          ) : null}
        </div>

        {error ? (
          <p id={errorId} className="field-error">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="field-hint">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
