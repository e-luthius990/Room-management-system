import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import type { CurrentUserContext } from "@/lib/auth/types";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import {
  OPERATIONS_SEARCH_MIN_LENGTH,
  normalizeOperationsSearchQuery,
  normalizeOperationsSearchScope,
  searchOperations,
  type OperationSearchResult,
  type OperationsSearchScope,
} from "@/lib/queries/operations/search";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type OperationSearchResponse = {
  items: OperationSearchResult[];
};

type ErrorResponse = {
  error: string;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 120;

function jsonResponse(
  body: OperationSearchResponse,
  init?: ResponseInit,
): NextResponse<OperationSearchResponse> {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}

function errorResponse(
  error: string,
  status: number,
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

async function authorizeSearchScope(
  scope: OperationsSearchScope,
): Promise<CurrentUserContext> {
  if (scope === "security") {
    const currentUser = await requirePermission("security.view_clearance");
    await requirePermission("guests.view");

    return currentUser;
  }

  const currentUser = await requirePermission("guests.view");
  await requirePermission("rooms.view");

  return currentUser;
}

export async function GET(request: Request): Promise<NextResponse> {
  const rateLimit = checkRateLimit({
    key: getClientIp(request),
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
    namespace: "operations-search",
  });

  if (rateLimit.limited) {
    const response = errorResponse("rate_limited", 429);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));

    return response;
  }

  const url = new URL(request.url);
  const scope = normalizeOperationsSearchScope(url.searchParams.get("scope"));

  if (!scope) {
    return errorResponse("invalid_scope", 400);
  }

  const query = normalizeOperationsSearchQuery(url.searchParams.get("q"));

  if (query.length < OPERATIONS_SEARCH_MIN_LENGTH) {
    return jsonResponse({ items: [] });
  }

  const currentUser = await authorizeSearchScope(scope);
  const items = await searchOperations({
    scope,
    currentUser,
    query,
  });

  return jsonResponse({ items });
}
