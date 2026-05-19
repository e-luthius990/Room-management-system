import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "children" | "aria-describedby"
> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  invalid?: boolean;
  placeholder?: string;
  options: readonly SelectOption[];
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

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      className,
      wrapperClassName,
      labelClassName,
      label,
      hint,
      error,
      invalid = false,
      placeholder,
      options,
      id,
      name,
      disabled = false,
      required,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ): React.JSX.Element {
    const reactId = React.useId();
    const selectId = id ?? reactId;

    const hasError = Boolean(error);
    const isInvalid = invalid || hasError;

    const hintId = hint ? `${selectId}-hint` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;

    const describedBy = buildDescribedBy([ariaDescribedBy, hintId, errorId]);

    return (
      <div
        className={cn("field-group", wrapperClassName)}
        data-disabled={disabled ? "true" : undefined}
        data-invalid={isInvalid ? "true" : undefined}
      >
        {label ? (
          <label
            htmlFor={selectId}
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

        <select
          ref={ref}
          id={selectId}
          name={name}
          disabled={disabled}
          required={required}
          aria-invalid={isInvalid || undefined}
          aria-errormessage={hasError ? errorId : undefined}
          aria-describedby={describedBy}
          data-invalid={isInvalid ? "true" : undefined}
          className={cn("select", isInvalid && "field-invalid", className)}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}

          {options.map((option) => (
            <option
              key={`${option.value}-${option.label}`}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

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

Select.displayName = "Select";
