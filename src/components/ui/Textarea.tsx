import * as React from "react";
import { cn } from "@/lib/utils/cn";

export type TextareaProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    hint?: string;
    error?: string;
    wrapperClassName?: string;
  };

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      className,
      wrapperClassName,
      label,
      hint,
      error,
      id,
      name,
      disabled,
      ...props
    },
    ref,
  ) {
    const reactId = React.useId();
    const textareaId = id ?? name ?? reactId;

    const hasError = Boolean(error);
    const hintId = hint ? `${textareaId}-hint` : undefined;
    const errorId = error ? `${textareaId}-error` : undefined;
    const describedBy = errorId ?? hintId;

    return (
      <div className={cn("field-group", wrapperClassName)}>
        {label ? (
          <label htmlFor={textareaId} className="field-label">
            {label}
          </label>
        ) : null}

        <textarea
          ref={ref}
          id={textareaId}
          name={name}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "textarea",
            hasError
              ? "border-danger-600 focus:border-danger-600 focus:ring-danger-600/20"
              : undefined,
            className,
          )}
          {...props}
        />

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

Textarea.displayName = "Textarea";
