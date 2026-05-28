"use client";

import { useLinkStatus } from "next/link";

import { cn } from "@/lib/utils/cn";

export function LinkPendingIndicator({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={cn("link-pending-indicator", pending && "is-pending", className)}
    />
  );
}
