import "server-only";

import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type NotificationStatus = Enums<"notification_status">;

export type NotificationListItem = {
  id: string;
  recipient_id: string | null;
  recipient_name: string | null;
  camp_id: string | null;
  camp_name: string | null;
  title: string;
  message: string;
  body: string;
  category: string | null;
  severity: string | null;
  status: NotificationStatus;
  entity_type: string | null;
  entity_id: string | null;
  action_href: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationRow = {
  id: string;
  user_id: string | null;
  recipient_id: string | null;
  camp_id: string | null;
  title: string | null;
  message: string | null;
  body: string | null;
  category: string | null;
  severity: string | null;
  status: NotificationStatus;
  entity_type: string | null;
  entity_id: string | null;
  action_href: string | null;
  read_at: string | null;
  created_at: string | null;
};

type ProfileNameRow = {
  id: string;
  full_name: string | null;
};

type CampNameRow = {
  id: string;
  name: string | null;
};

function uniqueStrings(values: ReadonlyArray<string | null>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function toRequiredText(value: string | null, fallback: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

export async function getNotifications(): Promise<NotificationListItem[]> {
  const supabase = await createServerSupabaseClient();

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(
      [
        "id",
        "user_id",
        "recipient_id",
        "camp_id",
        "title",
        "message",
        "body",
        "category",
        "severity",
        "status",
        "entity_type",
        "entity_id",
        "action_href",
        "read_at",
        "created_at",
      ].join(","),
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(300)
    .returns<NotificationRow[]>();

  if (error) {
    throw new Error(`Failed to load notifications: ${error.message}`);
  }

  const rows = notifications ?? [];

  if (rows.length === 0) {
    return [];
  }

  const recipientIds = uniqueStrings(
    rows.map((notification) => notification.recipient_id ?? notification.user_id),
  );

  const campIds = uniqueStrings(
    rows.map((notification) => notification.camp_id),
  );

  const recipientNamesById = new Map<string, string>();
  const campNamesById = new Map<string, string>();

  if (recipientIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", recipientIds)
      .returns<ProfileNameRow[]>();

    if (profilesError) {
      throw new Error(
        `Failed to load notification recipients: ${profilesError.message}`,
      );
    }

    for (const profile of profiles ?? []) {
      recipientNamesById.set(
        profile.id,
        toRequiredText(profile.full_name, "Unknown user"),
      );
    }
  }

  if (campIds.length > 0) {
    const { data: camps, error: campsError } = await supabase
      .from("camps")
      .select("id,name")
      .in("id", campIds)
      .is("deleted_at", null)
      .returns<CampNameRow[]>();

    if (campsError) {
      throw new Error(`Failed to load notification camps: ${campsError.message}`);
    }

    for (const camp of camps ?? []) {
      campNamesById.set(camp.id, toRequiredText(camp.name, "Unknown camp"));
    }
  }

  return rows.map((notification) => {
    const recipientId = notification.recipient_id ?? notification.user_id;
    const message = toRequiredText(
      notification.message,
      "No message provided.",
    );

    return {
      id: notification.id,
      recipient_id: recipientId,
      recipient_name: recipientId
        ? recipientNamesById.get(recipientId) ?? null
        : null,
      camp_id: notification.camp_id,
      camp_name: notification.camp_id
        ? campNamesById.get(notification.camp_id) ?? null
        : null,
      title: toRequiredText(notification.title, "Untitled notification"),
      message,
      body: toRequiredText(notification.body, message),
      category: notification.category,
      severity: notification.severity,
      status: notification.status,
      entity_type: notification.entity_type,
      entity_id: notification.entity_id,
      action_href: notification.action_href,
      read_at: notification.read_at,
      created_at: notification.created_at ?? new Date(0).toISOString(),
    };
  });
}