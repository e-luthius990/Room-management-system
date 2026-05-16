import * as React from "react";
import { cn } from "@/lib/utils/cn";

type CardVariant = "card" | "panel" | "section" | "muted" | "glass" | "ops";

type CardPadding = "none" | "sm" | "md" | "lg";

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
  padding?: CardPadding;
};

const variantClass: Record<CardVariant, string> = {
  card: "surface-card",
  panel: "surface-panel",
  section: "surface-section",
  muted: "muted-panel",
  glass: "surface-glass rounded-3xl",
  ops: "ops-card",
};

const paddingClass: Record<CardPadding, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant = "card", padding = "none", children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(variantClass[variant], paddingClass[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
});

export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

export function CardHeader({
  children,
  className,
  ...props
}: CardHeaderProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-border px-4 py-4 sm:px-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

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

export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

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

export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

export function CardContent({
  children,
  className,
  ...props
}: CardContentProps): React.JSX.Element {
  return (
    <div className={cn("px-4 py-4 sm:px-5", className)} {...props}>
      {children}
    </div>
  );
}

export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

export function CardFooter({
  children,
  className,
  ...props
}: CardFooterProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type CardMetaProps = React.HTMLAttributes<HTMLParagraphElement>;

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
