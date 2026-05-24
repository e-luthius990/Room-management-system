import * as React from "react";
import { cn } from "@/lib/utils/cn";

type CardVariant =
  | "card"
  | "panel"
  | "section"
  | "muted"
  | "glass"
  | "ops"
  | "console"
  | "inspector";

type CardPadding = "none" | "sm" | "md" | "lg";

export type CardProps = React.ComponentPropsWithoutRef<"div"> & {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  selected?: boolean;
};

const variantClass: Record<CardVariant, string> = {
  card: "surface-card",
  panel: "surface-panel",
  section: "surface-section",
  muted: "muted-panel",
  glass: "surface-glass",
  ops: "ops-card",
  console: "ops-console-card",
  inspector: "ops-inspector-card",
};

const paddingClass: Record<CardPadding, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

const variantsWithIntrinsicPadding = new Set<CardVariant>([
  "section",
  "muted",
  "ops",
  "console",
  "inspector",
]);

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    className,
    variant = "card",
    padding = "none",
    interactive = false,
    selected = false,
    children,
    ...props
  },
  ref,
): React.JSX.Element {
  const shouldApplyPadding =
    padding !== "none" && !variantsWithIntrinsicPadding.has(variant);

  return (
    <div
      ref={ref}
      data-card-variant={variant}
      data-card-padding={shouldApplyPadding ? padding : undefined}
      data-interactive={interactive ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      className={cn(
        variantClass[variant],
        interactive && "surface-card-interactive",
        selected && "surface-card-selected",
        shouldApplyPadding && paddingClass[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";

export type CardHeaderProps = React.ComponentPropsWithoutRef<"div"> & {
  divided?: boolean;
  dense?: boolean;
};

export function CardHeader({
  children,
  className,
  divided = true,
  dense = false,
  ...props
}: CardHeaderProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 px-4 sm:px-5",
        dense ? "py-3" : "py-4",
        divided && "border-b border-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CardTitleProps = React.ComponentPropsWithoutRef<"h2">;

export function CardTitle({
  children,
  className,
  ...props
}: CardTitleProps): React.JSX.Element {
  return (
    <h2
      className={cn(
        "text-base font-semibold tracking-[-0.025em] text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

export type CardDescriptionProps = React.ComponentPropsWithoutRef<"p">;

export function CardDescription({
  children,
  className,
  ...props
}: CardDescriptionProps): React.JSX.Element {
  return (
    <p className={cn("text-sm leading-6 text-muted", className)} {...props}>
      {children}
    </p>
  );
}

export type CardContentProps = React.ComponentPropsWithoutRef<"div"> & {
  dense?: boolean;
};

export function CardContent({
  children,
  className,
  dense = false,
  ...props
}: CardContentProps): React.JSX.Element {
  return (
    <div
      className={cn("px-4 sm:px-5", dense ? "py-3" : "py-4", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export type CardFooterProps = React.ComponentPropsWithoutRef<"div"> & {
  divided?: boolean;
  align?: "start" | "between" | "end";
  dense?: boolean;
};

const footerAlignClass: Record<
  NonNullable<CardFooterProps["align"]>,
  string
> = {
  start: "sm:justify-start",
  between: "sm:justify-between",
  end: "sm:justify-end",
};

export function CardFooter({
  children,
  className,
  divided = true,
  align = "end",
  dense = false,
  ...props
}: CardFooterProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:px-5",
        dense ? "py-3" : "py-4",
        footerAlignClass[align],
        divided && "border-t border-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CardMetaProps = React.ComponentPropsWithoutRef<"p">;

export function CardMeta({
  children,
  className,
  ...props
}: CardMetaProps): React.JSX.Element {
  return (
    <p
      className={cn("text-xs font-medium leading-5 text-muted", className)}
      {...props}
    >
      {children}
    </p>
  );
}
