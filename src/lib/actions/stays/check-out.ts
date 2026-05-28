"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/require-permission";
import { notifyWorkflowPermission } from "@/lib/notifications/workflow-notifications";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkOutStaySchema } from "@/lib/validation/stays";

type CheckOutStayRpcResult = {
  id: string;
};

function getFormString(formData: FormData, key: string): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getRpcStayId(value: CheckOutStayRpcResult | null): string | null {
  if (value && typeof value.id === "string" && value.id.trim().length > 0) {
    return value.id;
  }

  return null;
}

function mapCheckOutError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("stay not found")) {
    return "stay_not_found";
  }

  if (normalized.includes("only checked-in or occupied")) {
    return "invalid_stay_status";
  }

  if (normalized.includes("room not found")) {
    return "room_not_found";
  }

  if (normalized.includes("invalid room status transition")) {
    return "invalid_room_status_transition";
  }

  if (
    normalized.includes("access") ||
    normalized.includes("permission") ||
    normalized.includes("not authorized") ||
    normalized.includes("policy")
  ) {
    return "access_denied";
  }

  return "check_out_failed";
}

async function notifyStayCheckedOut(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  stayId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("stays")
    .select("id,camp_id,guests(full_name),rooms(room_number)")
    .eq("id", stayId)
    .returns<
      {
        id: string;
        camp_id: string;
        guests: { full_name: string | null } | null;
        rooms: { room_number: string | null } | null;
      }[]
    >()
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("Failed to load stay notification context:", error.message);
    }

    return;
  }

  await notifyWorkflowPermission({
    permission: "stays.view",
    campId: data.camp_id,
    title: "Guest checked out",
    body: `${data.guests?.full_name ?? "A guest"} checked out from ${
      data.rooms?.room_number ? `Room ${data.rooms.room_number}` : "a room"
    }.`,
    category: "stay",
    severity: "info",
    actionHref: `/stays/${data.id}`,
    entityType: "stays",
    entityId: data.id,
  });
}

export async function checkOutStayAction(formData: FormData): Promise<never> {
  await requirePermission("stays.check_out");

  const fallbackStayId = getFormString(formData, "stayId");

  const parsed = checkOutStaySchema.safeParse({
    stayId: fallbackStayId,
    notes: getFormString(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(
      fallbackStayId
        ? `/stays/${fallbackStayId}?error=invalid_input`
        : "/stays?error=invalid_input",
    );
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .rpc("check_out_stay", {
      p_stay_id: parsed.data.stayId,
      ...(parsed.data.notes ? { p_notes: parsed.data.notes } : {}),
    })
    .returns<CheckOutStayRpcResult>();

  const checkedOutStayId = getRpcStayId(data);

  if (error || !checkedOutStayId) {
    const code = mapCheckOutError(error?.message ?? "check_out_failed");

    redirect(`/stays/${parsed.data.stayId}?error=${code}`);
  }

  revalidatePath("/allocations");
  revalidatePath("/stays");
  revalidatePath(`/stays/${parsed.data.stayId}`);
  revalidatePath(`/stays/${checkedOutStayId}`);
  revalidatePath("/room-board");
  revalidatePath("/rooms");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reception");
  revalidatePath("/dashboard/camp-manager");
  revalidatePath("/reports");

  await notifyStayCheckedOut(supabase, checkedOutStayId);

  redirect(`/stays/${checkedOutStayId}`);
}
