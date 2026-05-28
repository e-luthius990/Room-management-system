import "server-only";

import type { CurrentUserContext } from "@/lib/auth/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type OperationsSearchScope =
  | "security"
  | "reception"
  | "manager"
  | "executive";

export type OperationSearchTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "brand"
  | "muted";

export type OperationSearchResult = {
  id: string;
  type: "guest" | "room";
  title: string;
  subtitle: string;
  meta: string | null;
  href: string;
  statusLabel: string | null;
  statusTone: OperationSearchTone;
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

export const OPERATIONS_SEARCH_MIN_LENGTH = 2;
export const OPERATIONS_SEARCH_MAX_LENGTH = 80;

const SEARCH_LIMIT = 8;
const FETCH_LIMIT = 12;

const SEARCH_SCOPES = new Set<OperationsSearchScope>([
  "security",
  "reception",
  "manager",
  "executive",
]);

export function normalizeOperationsSearchScope(
  value: string | null,
): OperationsSearchScope | null {
  const normalized = value?.trim().toLowerCase();

  if (
    !normalized ||
    !SEARCH_SCOPES.has(normalized as OperationsSearchScope)
  ) {
    return null;
  }

  return normalized as OperationsSearchScope;
}

export function normalizeOperationsSearchQuery(value: string | null): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, OPERATIONS_SEARCH_MAX_LENGTH);
}

function sanitizePostgrestSearchTerm(value: string): string {
  return value
    .replace(/[,%()_*]/g, " ")
    .replace(/[^\p{L}\p{N}\s@.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, OPERATIONS_SEARCH_MAX_LENGTH);
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

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getGuestStatusTone(status: string | null): OperationSearchTone {
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

function getRoomStatusTone(status: string | null): OperationSearchTone {
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

function guestHref(scope: OperationsSearchScope, guestId: string): string {
  if (scope === "security") {
    return `/security/guests/${guestId}`;
  }

  return `/guests/${guestId}`;
}

function mapGuestResult(
  scope: OperationsSearchScope,
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
        ? subtitleParts.join(" - ")
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

function normalizedCompareText(value: string | null): string {
  return (value ?? "").trim().toLowerCase();
}

function scoreResult(item: OperationSearchResult, searchTerm: string): number {
  const term = normalizedCompareText(searchTerm);
  const title = normalizedCompareText(item.title);
  const meta = normalizedCompareText(item.meta);
  const subtitle = normalizedCompareText(item.subtitle);

  if (title === term || title === `room ${term}`) {
    return 0;
  }

  if (meta === term) {
    return 1;
  }

  if (title.startsWith(term)) {
    return 2;
  }

  if (meta.startsWith(term)) {
    return 3;
  }

  if (title.includes(term)) {
    return 4;
  }

  if (meta.includes(term)) {
    return 5;
  }

  if (subtitle.includes(term)) {
    return 6;
  }

  return 7;
}

function sortAndLimitResults(
  items: OperationSearchResult[],
  searchTerm: string,
): OperationSearchResult[] {
  return [...items]
    .sort((left, right) => {
      const scoreDifference =
        scoreResult(left, searchTerm) - scoreResult(right, searchTerm);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return left.title.localeCompare(right.title, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    })
    .slice(0, SEARCH_LIMIT);
}

async function searchGuests({
  db,
  scope,
  campIds,
  searchTerm,
  limit,
}: {
  db: OperationsSearchDbClient;
  scope: OperationsSearchScope;
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

export async function searchOperations({
  scope,
  currentUser,
  query,
}: {
  scope: OperationsSearchScope;
  currentUser: CurrentUserContext;
  query: string;
}): Promise<OperationSearchResult[]> {
  const searchTerm = sanitizePostgrestSearchTerm(query);

  if (searchTerm.length < OPERATIONS_SEARCH_MIN_LENGTH) {
    return [];
  }

  const campIds = getCampIds(currentUser);

  if (campIds !== null && campIds.length === 0) {
    return [];
  }

  const db =
    createSupabaseAdminClient() as unknown as OperationsSearchDbClient;

  if (scope === "security") {
    const guests = await searchGuests({
      db,
      scope,
      campIds,
      searchTerm,
      limit: FETCH_LIMIT,
    });

    return sortAndLimitResults(guests, searchTerm);
  }

  const [guests, rooms] = await Promise.all([
    searchGuests({
      db,
      scope,
      campIds,
      searchTerm,
      limit: FETCH_LIMIT,
    }),
    searchRooms({
      db,
      campIds,
      searchTerm,
      limit: FETCH_LIMIT,
    }),
  ]);

  return sortAndLimitResults([...guests, ...rooms], searchTerm);
}
