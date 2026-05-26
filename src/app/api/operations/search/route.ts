import { NextResponse } from "next/server";

import { requirePermission } from "@/lib/auth/require-permission";
import type { CurrentUserContext } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchScope = "security" | "reception" | "manager" | "executive";

type SearchResultTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "brand"
  | "muted";

type OperationSearchResult = {
  id: string;
  type: "guest" | "room";
  title: string;
  subtitle: string;
  meta: string | null;
  href: string;
  statusLabel: string | null;
  statusTone: SearchResultTone;
};

type OperationSearchResponse = {
  items: OperationSearchResult[];
};

type ErrorResponse = {
  error: string;
};

type RpcError = {
  message: string;
};

type GuestSearchRow = {
  id: string;
  full_name: string;
  primary_camp_id: string | null;
  guest_category: string | null;
  organization: string | null;
  nationality: string | null;
  phone: string | null;
  id_or_passport_number: string | null;
  security_clearance_status: string | null;
};

type RoomSearchRow = {
  id: string;
  room_number: string;
  camp_id: string;
  current_status: string;
};

type QueryResult<T> = {
  data: T[] | null;
  error: RpcError | null;
};

type LimitBuilder<T> = {
  limit(count: number): Promise<QueryResult<T>>;
};

type FilterBuilder<T> = {
  is(column: string, value: null): FilterBuilder<T>;
  in(column: string, values: string[]): FilterBuilder<T>;
  or(filters: string): FilterBuilder<T>;
  order(column: string, options: { ascending: boolean }): LimitBuilder<T>;
};

type SelectBuilder<T> = {
  select(columns: string): FilterBuilder<T>;
};

type OperationsSearchDbClient = {
  from(table: "guests"): SelectBuilder<GuestSearchRow>;
  from(table: "rooms"): SelectBuilder<RoomSearchRow>;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const SEARCH_MIN_LENGTH = 2;
const SEARCH_MAX_LENGTH = 80;
const SEARCH_LIMIT = 8;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 120;

const SEARCH_SCOPES = new Set<SearchScope>([
  "security",
  "reception",
  "manager",
  "executive",
]);

const rateLimitBuckets = new Map<string, RateLimitBucket>();

function normalizeScope(value: string | null): SearchScope | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || !SEARCH_SCOPES.has(normalized as SearchScope)) {
    return null;
  }

  return normalized as SearchScope;
}

function normalizeQuery(value: string | null): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, SEARCH_MAX_LENGTH);
}

function sanitizePostgrestSearchTerm(value: string): string {
  return value
    .replace(/[,%()]/g, " ")
    .replace(/[^\p{L}\p{N}\s@.+_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SEARCH_MAX_LENGTH);
}

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

function getCampIds(currentUser: CurrentUserContext): string[] | null {
  if (currentUser.isSystemActor) {
    return null;
  }

  const campIds = currentUser.campAccess
    .map((access) => access.camp_id)
    .filter(
      (campId): campId is string =>
        typeof campId === "string" && campId.length > 0,
    );

  return [...new Set(campIds)];
}

async function authorizeSearchScope(
  scope: SearchScope,
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

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getGuestStatusTone(status: string | null): SearchResultTone {
  if (status === "cleared") {
    return "success";
  }

  if (status === "watchlist" || status === "suspended") {
    return "warning";
  }

  if (status === "denied") {
    return "danger";
  }

  if (status === "pending") {
    return "warning";
  }

  return "muted";
}

function getRoomStatusTone(status: string | null): SearchResultTone {
  if (status === "vacant_ready") {
    return "success";
  }

  if (
    status === "reserved" ||
    status === "pending_check_in" ||
    status === "pending_checkout" ||
    status === "manager_hold"
  ) {
    return "warning";
  }

  if (status === "occupied") {
    return "info";
  }

  if (status === "out_of_service" || status === "under_maintenance") {
    return "danger";
  }

  return "muted";
}

function guestHref(scope: SearchScope, guestId: string): string {
  if (scope === "security") {
    return `/security/guests/${guestId}`;
  }

  return `/guests/${guestId}`;
}

function mapGuestResult(
  scope: SearchScope,
  row: GuestSearchRow,
): OperationSearchResult {
  const subtitleParts = [
    row.organization,
    row.nationality,
    row.guest_category ? formatLabel(row.guest_category) : null,
  ].filter(Boolean);

  return {
    id: row.id,
    type: "guest",
    title: row.full_name,
    subtitle:
      subtitleParts.length > 0
        ? subtitleParts.join(" · ")
        : "No organization recorded",
    meta: row.phone ?? row.id_or_passport_number ?? null,
    href: guestHref(scope, row.id),
    statusLabel: row.security_clearance_status
      ? formatLabel(row.security_clearance_status)
      : null,
    statusTone: getGuestStatusTone(row.security_clearance_status),
  };
}

function mapRoomResult(row: RoomSearchRow): OperationSearchResult {
  return {
    id: row.id,
    type: "room",
    title: `Room ${row.room_number}`,
    subtitle: "Room board",
    meta: formatLabel(row.current_status),
    href: `/room-board?roomId=${encodeURIComponent(row.id)}`,
    statusLabel: formatLabel(row.current_status),
    statusTone: getRoomStatusTone(row.current_status),
  };
}

async function searchGuests({
  db,
  scope,
  campIds,
  searchTerm,
  limit,
}: {
  db: OperationsSearchDbClient;
  scope: SearchScope;
  campIds: string[] | null;
  searchTerm: string;
  limit: number;
}): Promise<OperationSearchResult[]> {
  let query = db
    .from("guests")
    .select(
      [
        "id",
        "full_name",
        "primary_camp_id",
        "guest_category",
        "organization",
        "nationality",
        "phone",
        "id_or_passport_number",
        "security_clearance_status",
      ].join(","),
    )
    .is("archived_at", null)
    .or(
      [
        `full_name.ilike.%${searchTerm}%`,
        `phone.ilike.%${searchTerm}%`,
        `organization.ilike.%${searchTerm}%`,
        `id_or_passport_number.ilike.%${searchTerm}%`,
      ].join(","),
    );

  if (campIds !== null) {
    query = query.in("primary_camp_id", campIds);
  }

  const { data, error } = await query
    .order("full_name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Operations guest search failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapGuestResult(scope, row));
}

async function searchRooms({
  db,
  campIds,
  searchTerm,
  limit,
}: {
  db: OperationsSearchDbClient;
  campIds: string[] | null;
  searchTerm: string;
  limit: number;
}): Promise<OperationSearchResult[]> {
  let query = db
    .from("rooms")
    .select(["id", "room_number", "camp_id", "current_status"].join(","))
    .is("deleted_at", null)
    .or([`room_number.ilike.%${searchTerm}%`].join(","));

  if (campIds !== null) {
    query = query.in("camp_id", campIds);
  }

  const { data, error } = await query
    .order("room_number", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Operations room search failed:", error.message);
    return [];
  }

  return (data ?? []).map(mapRoomResult);
}

async function searchByScope({
  scope,
  currentUser,
  searchTerm,
}: {
  scope: SearchScope;
  currentUser: CurrentUserContext;
  searchTerm: string;
}): Promise<OperationSearchResult[]> {
  const campIds = getCampIds(currentUser);

  if (campIds !== null && campIds.length === 0) {
    return [];
  }

  const db =
    createSupabaseAdminClient() as unknown as OperationsSearchDbClient;

  if (scope === "security") {
    return searchGuests({
      db,
      scope,
      campIds,
      searchTerm,
      limit: SEARCH_LIMIT,
    });
  }

  const [guests, rooms] = await Promise.all([
    searchGuests({
      db,
      scope,
      campIds,
      searchTerm,
      limit: 5,
    }),
    searchRooms({
      db,
      campIds,
      searchTerm,
      limit: 5,
    }),
  ]);

  return [...guests, ...rooms].slice(0, SEARCH_LIMIT);
}

export async function GET(request: Request): Promise<NextResponse> {
  if (isRateLimited(request)) {
    return errorResponse("rate_limited", 429);
  }

  const url = new URL(request.url);
  const scope = normalizeScope(url.searchParams.get("scope"));

  if (!scope) {
    return errorResponse("invalid_scope", 400);
  }

  const currentUser = await authorizeSearchScope(scope);

  const query = normalizeQuery(url.searchParams.get("q"));

  if (query.length < SEARCH_MIN_LENGTH) {
    return jsonResponse({ items: [] });
  }

  const searchTerm = sanitizePostgrestSearchTerm(query);

  if (searchTerm.length < SEARCH_MIN_LENGTH) {
    return jsonResponse({ items: [] });
  }

  const items = await searchByScope({
    scope,
    currentUser,
    searchTerm,
  });

  return jsonResponse({ items });
}