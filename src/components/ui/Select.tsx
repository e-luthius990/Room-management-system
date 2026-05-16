import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  options: readonly SelectOption[];
  wrapperClassName?: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      className,
      wrapperClassName,
      label,
      hint,
      error,
      placeholder,
      options,
      id,
      name,
      disabled,
      ...props
    },
    ref,
  ) {
    const reactId = React.useId();
    const selectId = id ?? name ?? reactId;

    const hasError = Boolean(error);
    const hintId = hint ? `${selectId}-hint` : undefined;
    const errorId = error ? `${selectId}-error` : undefined;
    const describedBy = errorId ?? hintId;

    return (
      <div className={cn("field-group", wrapperClassName)}>
        {label ? (
          <label htmlFor={selectId} className="field-label">
            {label}
          </label>
        ) : null}

        <select
          ref={ref}
          id={selectId}
          name={name}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "select",
            hasError
              ? "border-danger-600 focus:border-danger-600 focus:ring-danger-600/20"
              : undefined,
            className,
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

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

Select.displayName = "Select";
