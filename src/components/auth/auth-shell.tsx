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
    <main className="auth-theme relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="auth-theme-wash" aria-hidden="true" />
      <div className="auth-theme-lines" aria-hidden="true" />
      <div className="auth-theme-grid" aria-hidden="true" />

      <section
        aria-labelledby="auth-title"
        aria-describedby="auth-description"
        className="relative z-10 w-full max-w-md"
      >
        <Card
          variant="card"
          className="auth-card overflow-hidden"
        >
          <CardHeader className="px-6 py-6">
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
