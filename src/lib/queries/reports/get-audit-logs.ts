import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuditLogListItem = {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  camp_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type AuditLogFilters = {
  campId?: string | null;
  action?: string | null;
  entityType?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  limit?: number;
};

type AuditLogRow = {
  id: string;
  actor_user_id: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  camp_id: string | null;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
};

function toRecord(value: unknown): Record<string, unknown> | null {
  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return null;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 200;
  }

  return Math.min(Math.max(Math.trunc(value), 1), 500);
}

export async function getAuditLogs(
  filters: AuditLogFilters = {},
): Promise<AuditLogListItem[]> {
  const supabase = await createServerSupabaseClient();

  const campId = normalizeOptionalText(filters.campId);
  const action = normalizeOptionalText(filters.action);
  const entityType = normalizeOptionalText(filters.entityType);
  const dateFrom = normalizeOptionalText(filters.dateFrom);
  const dateTo = normalizeOptionalText(filters.dateTo);
  const limit = normalizeLimit(filters.limit);

  let query = supabase
    .from("audit_logs")
    .select(
      [
        "id",
        "actor_user_id",
        "action",
        "entity_type",
        "entity_id",
        "camp_id",
        "old_value",
        "new_value",
        "reason",
        "ip_address",
        "user_agent",
        "created_at",
      ].join(","),
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (campId) {
    query = query.eq("camp_id", campId);
  }

  if (action) {
    query = query.eq("action", action);
  }

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }

  if (dateTo) {
    query = query.lte("created_at", dateTo);
  }

  const { data, error } = await query.returns<AuditLogRow[]>();

  if (error) {
    throw new Error(`Failed to load audit logs: ${error.message}`);
  }

  return (data ?? []).map((log) => ({
    id: log.id,
    actor_user_id: log.actor_user_id,
    action: log.action ?? "unknown_action",
    entity_type: log.entity_type ?? "unknown_entity",
    entity_id: log.entity_id,
    camp_id: log.camp_id,
    old_value: toRecord(log.old_value),
    new_value: toRecord(log.new_value),
    reason: log.reason,
    ip_address: log.ip_address,
    user_agent: log.user_agent,
    created_at: log.created_at ?? new Date(0).toISOString(),
  }));
}