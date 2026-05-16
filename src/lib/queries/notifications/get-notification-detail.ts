import "server-only";

import { notFound } from "next/navigation";
import type { Enums } from "@/lib/db/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type NotificationStatus = Enums<"notification_status">;

export type NotificationDetail = {
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
  created_by_name: string | null;
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
  created_by: string | null;
};

type ProfileNameRow = {
  id: string;
  full_name: string | null;
};

type CampNameRow = {
  id: string;
  name: string | null;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function toRequiredText(value: string | null, fallback: string): string {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : fallback;
}

export async function getNotificationDetail(
  notificationId: string,
): Promise<NotificationDetail> {
  if (!isUuid(notificationId)) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
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
        "created_by",
      ].join(","),
    )
    .eq("id", notificationId)
    .is("archived_at", null)
    .returns<NotificationRow[]>()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load notification: ${error.message}`);
  }

  if (!data) {
    notFound();
  }

  const recipientId = data.recipient_id ?? data.user_id;

  let recipientName: string | null = null;
  let campName: string | null = null;
  let createdByName: string | null = null;

  if (recipientId) {
    const { data: recipient, error: recipientError } = await supabase
      .from("profiles")
      .select("id,full_name")
      .eq("id", recipientId)
      .returns<ProfileNameRow[]>()
      .maybeSingle();

    if (recipientError) {
      throw new Error(
        `Failed to load notification recipient: ${recipientError.message}`,
      );
    }

    recipientName = recipient?.full_name ?? null;
  }

  if (data.camp_id) {
    const { data: camp, error: campError } = await supabase
      .from("camps")
      .select("id,name")
      .eq("id", data.camp_id)
      .is("deleted_at", null)
      .returns<CampNameRow[]>()
      .maybeSingle();

    if (campError) {
      throw new Error(`Failed to load notification camp: ${campError.message}`);
    }

    campName = camp?.name ?? null;
  }

  if (data.created_by) {
    const { data: createdBy, error: createdByError } = await supabase
      .from("profiles")
      .select("id,full_name")
      .eq("id", data.created_by)
      .returns<ProfileNameRow[]>()
      .maybeSingle();

    if (createdByError) {
      throw new Error(
        `Failed to load notification creator: ${createdByError.message}`,
      );
    }

    createdByName = createdBy?.full_name ?? null;
  }

  const message = toRequiredText(data.message, "No message provided.");

  return {
    id: data.id,
    recipient_id: recipientId,
    recipient_name: recipientName,
    camp_id: data.camp_id,
    camp_name: campName,
    title: toRequiredText(data.title, "Untitled notification"),
    message,
    body: toRequiredText(data.body, message),
    category: data.category,
    severity: data.severity,
    status: data.status,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    action_href: data.action_href,
    read_at: data.read_at,
    created_at: data.created_at ?? new Date(0).toISOString(),
    created_by_name: createdByName,
  };
}