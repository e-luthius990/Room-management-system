import { NextResponse } from "next/server";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { getManagerDashboardData } from "@/lib/queries/manager/get-manager-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  await requireAnyPermission([
    "dashboard.view",
    "rooms.view",
    "rooms.view_board",
    "stays.view",
    "stays.view_current",
    "stays.view_history",
    "security.view_presence",
  ]);

  const data = await getManagerDashboardData();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}