import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type InputProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "aria-describedby"
> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  invalid?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
  "aria-describedby"?: string;
};

function buildDescribedBy(ids: Array<string | undefined>): string | undefined {
  const value = ids
    .map((id) => id?.trim())
    .filter(Boolean)
    .join(" ");

  return value.length > 0 ? value : undefined;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      className,
      wrapperClassName,
      labelClassName,
      label,
      hint,
      error,
      invalid = false,
      id,
      name,
      leftIcon,
      rightIcon,
      disabled = false,
      required,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ): React.JSX.Element {
    const reactId = React.useId();
    const inputId = id ?? reactId;

    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    const hasLeftIcon = Boolean(leftIcon);
    const hasRightIcon = Boolean(rightIcon);
    const hasError = Boolean(error);
    const isInvalid = invalid || hasError;

    const describedBy = buildDescribedBy([ariaDescribedBy, hintId, errorId]);

    return (
      <div
        className={cn("field-group", wrapperClassName)}
        data-disabled={disabled ? "true" : undefined}
        data-invalid={isInvalid ? "true" : undefined}
      >
        {label ? (
          <label
            htmlFor={inputId}
            className={cn("field-label", labelClassName)}
          >
            {label}
            {required ? (
              <span aria-hidden="true" className="ml-1 text-danger-700">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        <div
          className="relative"
          data-has-left-icon={hasLeftIcon ? "true" : undefined}
          data-has-right-icon={hasRightIcon ? "true" : undefined}
        >
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
            required={required}
            aria-invalid={isInvalid || undefined}
            aria-errormessage={isInvalid && hasError ? errorId : undefined}
            aria-describedby={describedBy}
            data-invalid={isInvalid ? "true" : undefined}
            className={cn(
              "input",
              hasLeftIcon && "pl-10",
              hasRightIcon && "pr-10",
              isInvalid && "input-invalid",
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

        {hint ? (
          <p id={hintId} className="field-hint">
            {hint}
          </p>
        ) : null}

        {error ? (
          <p id={errorId} className="field-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
