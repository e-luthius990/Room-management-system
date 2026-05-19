// src/components/layout/page-header.tsx
import * as React from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PageHeaderProps = Omit<
  React.ComponentPropsWithoutRef<"section">,
  "title"
> & {
  title: ReactNode;
  description?: ReactNode;
  kicker?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
  contentClassName?: string;
  actionsClassName?: string;
};

export function PageHeader({
  title,
  description,
  kicker,
  actions,
  titleId,
  className,
  contentClassName,
  actionsClassName,
  ...props
}: PageHeaderProps): React.JSX.Element {
  const reactId = React.useId();
  const resolvedTitleId = titleId ?? `${reactId}-page-title`;

  return (
    <section
      aria-labelledby={resolvedTitleId}
      className={cn("page-header", className)}
      {...props}
    >
      <div className={cn("min-w-0", contentClassName)}>
        {kicker ? <div className="page-kicker">{kicker}</div> : null}

        <h1 id={resolvedTitleId} className="page-title">
          {title}
        </h1>

        {description ? <p className="page-description">{description}</p> : null}
      </div>

      {actions ? (
        <div
          className={cn(
            "page-actions w-full shrink-0 sm:w-auto sm:justify-end",
            actionsClassName,
          )}
        >
          {actions}
        </div>
      ) : null}
    </section>
  );
}
