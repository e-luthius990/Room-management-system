import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { getDefaultRouteForUser } from "@/lib/auth/redirect-by-role";

export default async function DashboardRouterPage(): Promise<never> {
  const currentUser = await requireAuth();

  redirect(getDefaultRouteForUser(currentUser));
}
