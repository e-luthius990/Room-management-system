"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notifyWorkflowPermission } from "@/lib/notifications/workflow-notifications";
import type { Database } from "@/lib/db/types";

export type FieldAbsenceRow =
  Database["public"]["Views"]["field_absences_view"]["Row"];

type FieldAbsenceStatus =
  Database["public"]["Enums"]["field_absence_status"];

type CreateFieldAbsenceInput = {
  stayId: string;
  departureAt: string;
  expectedReturnAt: string;
  destination?: string;
  reason?: string;
  notes?: string;
};

type ExtendFieldAbsenceInput = {
  fieldAbsenceId: string;
  expectedReturnAt: string;
  reason?: string;
  notes?: string;
};

type MarkFieldAbsenceReturnedInput = {
  fieldAbsenceId: string;
  actualReturnAt?: string;
  returnNotes?: string;
};

type ListFieldAbsencesFilters = {
  campId?: string;
  status?: FieldAbsenceStatus | "active" | "all";
  query?: string;
};

function normalizeQuery(value?: string): string {
  return value?.trim() ?? "";
}

function getFieldAbsenceGuestName(row: FieldAbsenceRow): string {
  return row.guest_name ?? "Guest";
}

async function notifyFieldAbsenceWorkflow(
  row: FieldAbsenceRow,
  event: "created" | "extended" | "returned" | "cancelled",
): Promise<void> {
  if (!row.field_absence_id) {
    return;
  }

  const guestName = getFieldAbsenceGuestName(row);
  const href = APP_ROUTES.fieldAbsences.detail(row.field_absence_id);
  const copy = {
    created: {
      title: "Field absence recorded",
      body: `${guestName} has departed on field absence.`,
      severity: "warning" as const,
    },
    extended: {
      title: "Field absence extended",
      body: `${guestName}'s expected return time was extended.`,
      severity: "warning" as const,
    },
    returned: {
      title: "Field absence returned",
      body: `${guestName} has returned from field absence.`,
      severity: "success" as const,
    },
    cancelled: {
      title: "Field absence cancelled",
      body: `${guestName}'s field absence was cancelled.`,
      severity: "info" as const,
    },
  }[event];

  await notifyWorkflowPermission({
    permission: "field_absences.view",
    campId: row.camp_id,
    title: copy.title,
    body: copy.body,
    category: "stay",
    severity: copy.severity,
    actionHref: href,
    entityType: "field_absences",
    entityId: row.field_absence_id,
  });
}

export async function getFieldAbsences(
  filters: ListFieldAbsencesFilters = {},
): Promise<FieldAbsenceRow[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("field_absences_view")
    .select("*")
    .order("expected_return_at", { ascending: true });

  if (filters.campId) {
    query = query.eq("camp_id", filters.campId);
  }

  if (filters.status === "active") {
    query = query.in("status", ["away", "extended"]);
  } else if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const search = normalizeQuery(filters.query);

  if (search) {
    query = query.or(
      [
        `guest_name.ilike.%${search}%`,
        `guest_phone.ilike.%${search}%`,
        `guest_email.ilike.%${search}%`,
        `guest_organization.ilike.%${search}%`,
        `room_number.ilike.%${search}%`,
        `destination.ilike.%${search}%`,
        `reason.ilike.%${search}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getFieldAbsenceById(
  fieldAbsenceId: string,
): Promise<FieldAbsenceRow | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("field_absences_view")
    .select("*")
    .eq("field_absence_id", fieldAbsenceId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getActiveFieldAbsenceByStayId(
  stayId: string,
): Promise<FieldAbsenceRow | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("active_field_absences_view")
    .select("*")
    .eq("stay_id", stayId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createFieldAbsence(
  input: CreateFieldAbsenceInput,
): Promise<FieldAbsenceRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("create_field_absence", {
    p_stay_id: input.stayId,
    p_departure_at: input.departureAt,
    p_expected_return_at: input.expectedReturnAt,
    p_destination: input.destination,
    p_reason: input.reason,
    p_notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(APP_ROUTES.fieldAbsences.list);
  revalidatePath(APP_ROUTES.stays.detail(input.stayId));
  revalidatePath(APP_ROUTES.rooms.board);

  const created = await getFieldAbsenceById(data.id);

  if (!created) {
    throw new Error("Field absence was created but could not be loaded.");
  }

  await notifyFieldAbsenceWorkflow(created, "created");

  return created;
}

export async function extendFieldAbsence(
  input: ExtendFieldAbsenceInput,
): Promise<FieldAbsenceRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("extend_field_absence", {
    p_field_absence_id: input.fieldAbsenceId,
    p_expected_return_at: input.expectedReturnAt,
    p_reason: input.reason,
    p_notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(APP_ROUTES.fieldAbsences.list);
  revalidatePath(APP_ROUTES.fieldAbsences.detail(input.fieldAbsenceId));
  revalidatePath(APP_ROUTES.rooms.board);

  const updated = await getFieldAbsenceById(data.id);

  if (!updated) {
    throw new Error("Field absence was extended but could not be loaded.");
  }

  await notifyFieldAbsenceWorkflow(updated, "extended");

  return updated;
}

export async function markFieldAbsenceReturned(
  input: MarkFieldAbsenceReturnedInput,
): Promise<FieldAbsenceRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("mark_field_absence_returned", {
    p_field_absence_id: input.fieldAbsenceId,
    p_actual_return_at: input.actualReturnAt,
    p_return_notes: input.returnNotes,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(APP_ROUTES.fieldAbsences.list);
  revalidatePath(APP_ROUTES.fieldAbsences.detail(input.fieldAbsenceId));
  revalidatePath(APP_ROUTES.rooms.board);

  const updated = await getFieldAbsenceById(data.id);

  if (!updated) {
    throw new Error("Field absence was marked returned but could not be loaded.");
  }

  await notifyFieldAbsenceWorkflow(updated, "returned");

  return updated;
}

export async function cancelFieldAbsence(
  fieldAbsenceId: string,
  reason?: string,
): Promise<FieldAbsenceRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("cancel_field_absence", {
    p_field_absence_id: fieldAbsenceId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(APP_ROUTES.fieldAbsences.list);
  revalidatePath(APP_ROUTES.fieldAbsences.detail(fieldAbsenceId));
  revalidatePath(APP_ROUTES.rooms.board);

  const updated = await getFieldAbsenceById(data.id);

  if (!updated) {
    throw new Error("Field absence was cancelled but could not be loaded.");
  }

  await notifyFieldAbsenceWorkflow(updated, "cancelled");

  return updated;
}
