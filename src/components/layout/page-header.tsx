import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  kicker?: string;
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  kicker,
  actions,
}: PageHeaderProps): React.JSX.Element {
  const titleId = "page-title";

  return (
    <section
      aria-labelledby={titleId}
      className="page-header flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        {kicker ? <div className="page-kicker">{kicker}</div> : null}

        <h1 id={titleId} className="page-title">
          {title}
        </h1>

        {description ? <p className="page-description">{description}</p> : null}
      </div>

      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
