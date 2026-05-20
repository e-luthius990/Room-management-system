// src/components/ui/PendingSubmitButton.tsx
"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/Button";

type PendingSubmitButtonProps = Omit<
  ButtonProps,
  "type" | "loading" | "loadingText" | "aria-busy"
> & {
  pendingLabel?: string;
  icon?: ReactNode;
};

function getComparableValue(value: ButtonProps["value"]): string | null {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return null;
}

export function PendingSubmitButton({
  children,
  pendingLabel = "Loading...",
  icon,
  disabled = false,
  name,
  value,
  variant = "primary",
  size = "md",
  ...props
}: PendingSubmitButtonProps): React.JSX.Element {
  const { pending, data } = useFormStatus();

  const submitterValue = getComparableValue(value);
  const submittedValue = typeof name === "string" ? data?.get(name) : null;

  const shouldTrackSpecificSubmitter =
    pending && typeof name === "string" && submitterValue !== null;

  const isActiveSubmitter =
    !shouldTrackSpecificSubmitter || String(submittedValue) === submitterValue;

  const showPending = pending && isActiveSubmitter;

  return (
    <Button
      {...props}
      type="submit"
      name={name}
      value={value}
      variant={variant}
      size={size}
      disabled={disabled || pending}
      loading={showPending}
      loadingText={pendingLabel}
      leftIcon={icon}
      data-pending={showPending ? "true" : undefined}
    >
      {children}
    </Button>
  );
}
