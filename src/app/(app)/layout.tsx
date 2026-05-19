import type { ReactNode } from "react";
import { requireAuth } from "@/lib/auth/require-auth";
import { AppShell } from "@/components/layout/app-shell";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({
  children,
}: AppLayoutProps): Promise<React.JSX.Element> {
  const currentUser = await requireAuth();

  return <AppShell currentUser={currentUser}>{children}</AppShell>;
}
