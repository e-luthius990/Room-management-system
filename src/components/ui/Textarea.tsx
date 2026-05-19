import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type TextareaProps = Omit<
  React.ComponentPropsWithoutRef<"textarea">,
  "aria-describedby"
> & {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  invalid?: boolean;
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

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
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
      disabled = false,
      required,
      "aria-describedby": ariaDescribedBy,
      ...props
    },
    ref,
  ): React.JSX.Element {
    const reactId = React.useId();
    const textareaId = id ?? reactId;

    const hasError = Boolean(error);
    const isInvalid = invalid || hasError;

    const hintId = hint ? `${textareaId}-hint` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;

    const describedBy = buildDescribedBy([ariaDescribedBy, hintId, errorId]);

    return (
      <div
        className={cn("field-group", wrapperClassName)}
        data-disabled={disabled ? "true" : undefined}
        data-invalid={isInvalid ? "true" : undefined}
      >
        {label ? (
          <label
            htmlFor={textareaId}
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

        <textarea
          ref={ref}
          id={textareaId}
          name={name}
          disabled={disabled}
          required={required}
          aria-invalid={isInvalid || undefined}
          aria-errormessage={hasError ? errorId : undefined}
          aria-describedby={describedBy}
          data-invalid={isInvalid ? "true" : undefined}
          className={cn("textarea", isInvalid && "field-invalid", className)}
          {...props}
        />

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

Textarea.displayName = "Textarea";
