import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import type { CurrentUserContext } from "@/lib/auth/types";
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

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 120;

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    "unknown-client"
  );
}

function isRateLimited(request: Request): boolean {
  const now = Date.now();
  const key = getClientKey(request);
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    if (rateLimitBuckets.size > 2000) {
      for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
        if (bucket.resetAt <= now) {
          rateLimitBuckets.delete(bucketKey);
        }
      }
    }

    return false;
  }

  existing.count += 1;

  return existing.count > RATE_LIMIT_REQUESTS;
}

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
  if (isRateLimited(request)) {
    return errorResponse("rate_limited", 429);
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
