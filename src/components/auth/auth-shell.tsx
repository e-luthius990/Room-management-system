import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({
  title,
  description,
  children,
}: AuthShellProps): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section
        aria-labelledby="auth-title"
        aria-describedby="auth-description"
        className="w-full max-w-md"
      >
        <Card
          variant="card"
          className="overflow-hidden border-border"
        >
          <div className="h-1 w-full bg-primary" aria-hidden="true" />

          <CardHeader className="space-y-5 px-6 py-6">
            <div className="inline-flex w-fit items-center border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              CampRoomOps
            </div>

            <div>
              <h1
                id="auth-title"
                className="text-2xl font-semibold tracking-[-0.035em] text-foreground"
              >
                {title}
              </h1>

              <p
                id="auth-description"
                className="mt-3 text-sm leading-6 text-muted"
              >
                {description}
              </p>
            </div>
          </CardHeader>

          <CardContent className="px-6 py-6">{children}</CardContent>
        </Card>
      </section>
    </main>
  );
}
