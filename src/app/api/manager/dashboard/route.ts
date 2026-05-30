import { NextResponse } from "next/server";

import { requireAnyPermission } from "@/lib/auth/require-permission";
import { logError } from "@/lib/observability/logger";
import { getManagerDashboardData } from "@/lib/queries/manager/get-manager-dashboard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MANAGER_DASHBOARD_PERMISSIONS = [
  "dashboard.view",
  "rooms.view",
  "rooms.view_board",
  "stays.view",
  "stays.view_current",
  "stays.view_history",
  "security.view_presence",
] as const;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to load manager dashboard.";
}

function getStatusCode(error: unknown): number {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("unauthorized") ||
    message.includes("not authenticated") ||
    message.includes("auth session missing")
  ) {
    return 401;
  }

  if (
    message.includes("forbidden") ||
    message.includes("permission") ||
    message.includes("access denied")
  ) {
    return 403;
  }

  return 500;
}

export async function GET(): Promise<NextResponse> {
  try {
    const currentUser = await requireAnyPermission([
      ...MANAGER_DASHBOARD_PERMISSIONS,
    ]);

    const data = await getManagerDashboardData(currentUser);

    return NextResponse.json(data, {
      status: 200,
      headers: NO_STORE_HEADERS,
    });
  } catch (error) {
    const status = getStatusCode(error);
    logError("api.manager_dashboard.failed", error, {
      status,
    });

    return NextResponse.json(
      {
        ok: false,
        error:
          status === 500
            ? "Unable to load manager dashboard."
            : getErrorMessage(error),
      },
      {
        status,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}
