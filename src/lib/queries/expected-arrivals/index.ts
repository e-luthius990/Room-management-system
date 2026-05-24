"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database, Enums } from "@/lib/db/types";

export type ExpectedArrivalRow =
  Database["public"]["Views"]["expected_arrivals_view"]["Row"];

type ExpectedArrivalStatus =
  Database["public"]["Enums"]["expected_arrival_status"];

type CreateExpectedArrivalInput = {
  guestId: string;
  campId: string;
  expectedArrivalAt: string;
  expectedDepartureAt?: string;
  purpose?: string;
  hostName?: string;
  hostDepartment?: string;
  notes?: string;
};

export type CreateExpectedArrivalWithGuestInput = {
  campId: string;
  fullName: string;
  guestCategory: Enums<"guest_category">;
  expectedArrivalAt: string;
  expectedDepartureAt?: string;
  gender?: string;
  nationality?: string;
  organization?: string;
  departmentOrProject?: string;
  phone?: string;
  email?: string;
  idOrPassportNumber?: string;
  purpose?: string;
  hostName?: string;
  hostDepartment?: string;
  notes?: string;
};

type UpdateExpectedArrivalInput = {
  expectedArrivalId: string;
  guestId?: string;
  expectedArrivalAt?: string;
  expectedDepartureAt?: string;
  purpose?: string;
  hostName?: string;
  hostDepartment?: string;
  notes?: string;
};

type AllocateExpectedArrivalInput = {
  expectedArrivalId: string;
  roomId: string;
  expectedDepartureAt?: string;
  notes?: string;
};

type ListExpectedArrivalsFilters = {
  campId?: string;
  status?: ExpectedArrivalStatus | "all";
  query?: string;
};

function normalizeQuery(value?: string): string {
  return value?.trim() ?? "";
}

function getRpcReturnedId(data: unknown): string {
  if (
    data &&
    typeof data === "object" &&
    "id" in data &&
    typeof data.id === "string"
  ) {
    return data.id;
  }

  throw new Error("Expected arrival RPC did not return an ID.");
}

export async function getExpectedArrivals(
  filters: ListExpectedArrivalsFilters = {},
): Promise<ExpectedArrivalRow[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("expected_arrivals_view")
    .select("*")
    .order("expected_arrival_at", { ascending: true });

  if (filters.campId) {
    query = query.eq("camp_id", filters.campId);
  }

  if (filters.status && filters.status !== "all") {
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
        `host_name.ilike.%${search}%`,
        `host_department.ilike.%${search}%`,
        `purpose.ilike.%${search}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getExpectedArrivalById(
  expectedArrivalId: string,
): Promise<ExpectedArrivalRow | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("expected_arrivals_view")
    .select("*")
    .eq("expected_arrival_id", expectedArrivalId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createExpectedArrival(
  input: CreateExpectedArrivalInput,
): Promise<ExpectedArrivalRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("create_expected_arrival", {
    p_guest_id: input.guestId,
    p_camp_id: input.campId,
    p_expected_arrival_at: input.expectedArrivalAt,
    p_expected_departure_at: input.expectedDepartureAt,
    p_purpose: input.purpose,
    p_host_name: input.hostName,
    p_host_department: input.hostDepartment,
    p_notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  const expectedArrivalId = getRpcReturnedId(data);

  revalidatePath(APP_ROUTES.reception.expectedArrivals);
  revalidatePath(APP_ROUTES.dashboards.reception);
  revalidatePath(APP_ROUTES.dashboards.security);

  const created = await getExpectedArrivalById(expectedArrivalId);

  if (!created) {
    throw new Error("Expected arrival was created but could not be loaded.");
  }

  return created;
}

export async function createExpectedArrivalWithGuest(
  input: CreateExpectedArrivalWithGuestInput,
): Promise<ExpectedArrivalRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc(
    "create_expected_arrival_with_guest",
    {
      p_camp_id: input.campId,
      p_full_name: input.fullName,
      p_guest_category: input.guestCategory,
      p_expected_arrival_at: input.expectedArrivalAt,
      p_expected_departure_at: input.expectedDepartureAt,
      p_gender: input.gender,
      p_nationality: input.nationality,
      p_organization: input.organization,
      p_department_or_project: input.departmentOrProject,
      p_phone: input.phone,
      p_email: input.email,
      p_id_or_passport_number: input.idOrPassportNumber,
      p_purpose: input.purpose,
      p_host_name: input.hostName,
      p_host_department: input.hostDepartment,
      p_notes: input.notes,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  const expectedArrivalId = getRpcReturnedId(data);

  revalidatePath(APP_ROUTES.reception.expectedArrivals);
  revalidatePath(APP_ROUTES.guests.list);
  revalidatePath(APP_ROUTES.dashboards.reception);
  revalidatePath(APP_ROUTES.dashboards.security);

  const created = await getExpectedArrivalById(expectedArrivalId);

  if (!created) {
    throw new Error(
      "Guest and expected arrival were created but could not be loaded.",
    );
  }

  return created;
}

export async function updateExpectedArrival(
  input: UpdateExpectedArrivalInput,
): Promise<ExpectedArrivalRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("update_expected_arrival", {
    p_expected_arrival_id: input.expectedArrivalId,
    p_guest_id: input.guestId,
    p_expected_arrival_at: input.expectedArrivalAt,
    p_expected_departure_at: input.expectedDepartureAt,
    p_purpose: input.purpose,
    p_host_name: input.hostName,
    p_host_department: input.hostDepartment,
    p_notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  const expectedArrivalId = getRpcReturnedId(data);

  revalidatePath(APP_ROUTES.reception.expectedArrivals);
  revalidatePath(
    APP_ROUTES.reception.expectedArrivalDetail(input.expectedArrivalId),
  );
  revalidatePath(APP_ROUTES.dashboards.reception);
  revalidatePath(APP_ROUTES.dashboards.security);

  const updated = await getExpectedArrivalById(expectedArrivalId);

  if (!updated) {
    throw new Error("Expected arrival was updated but could not be loaded.");
  }

  return updated;
}

export async function markExpectedArrivalArrived(
  expectedArrivalId: string,
  notes?: string,
): Promise<ExpectedArrivalRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("mark_expected_arrival_arrived", {
    p_expected_arrival_id: expectedArrivalId,
    p_notes: notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  const returnedExpectedArrivalId = getRpcReturnedId(data);

  revalidatePath(APP_ROUTES.reception.expectedArrivals);
  revalidatePath(APP_ROUTES.reception.expectedArrivalDetail(expectedArrivalId));
  revalidatePath(APP_ROUTES.dashboards.reception);
  revalidatePath(APP_ROUTES.dashboards.security);

  const updated = await getExpectedArrivalById(returnedExpectedArrivalId);

  if (!updated) {
    throw new Error("Expected arrival was updated but could not be loaded.");
  }

  return updated;
}

export async function cancelExpectedArrival(
  expectedArrivalId: string,
  reason?: string,
): Promise<ExpectedArrivalRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("cancel_expected_arrival", {
    p_expected_arrival_id: expectedArrivalId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  const returnedExpectedArrivalId = getRpcReturnedId(data);

  revalidatePath(APP_ROUTES.reception.expectedArrivals);
  revalidatePath(APP_ROUTES.reception.expectedArrivalDetail(expectedArrivalId));
  revalidatePath(APP_ROUTES.dashboards.reception);
  revalidatePath(APP_ROUTES.dashboards.security);

  const updated = await getExpectedArrivalById(returnedExpectedArrivalId);

  if (!updated) {
    throw new Error("Expected arrival was cancelled but could not be loaded.");
  }

  return updated;
}

export async function markExpectedArrivalNoShow(
  expectedArrivalId: string,
  reason?: string,
): Promise<ExpectedArrivalRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("mark_expected_arrival_no_show", {
    p_expected_arrival_id: expectedArrivalId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  const returnedExpectedArrivalId = getRpcReturnedId(data);

  revalidatePath(APP_ROUTES.reception.expectedArrivals);
  revalidatePath(APP_ROUTES.reception.expectedArrivalDetail(expectedArrivalId));
  revalidatePath(APP_ROUTES.dashboards.reception);
  revalidatePath(APP_ROUTES.dashboards.security);

  const updated = await getExpectedArrivalById(returnedExpectedArrivalId);

  if (!updated) {
    throw new Error(
      "Expected arrival was marked no-show but could not be loaded.",
    );
  }

  return updated;
}

export async function allocateExpectedArrival(
  input: AllocateExpectedArrivalInput,
): Promise<ExpectedArrivalRow> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("allocate_expected_arrival", {
    p_expected_arrival_id: input.expectedArrivalId,
    p_room_id: input.roomId,
    p_expected_departure_at: input.expectedDepartureAt,
    p_notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  const expectedArrivalId = getRpcReturnedId(data);

  revalidatePath(APP_ROUTES.reception.expectedArrivals);
  revalidatePath(
    APP_ROUTES.reception.expectedArrivalDetail(input.expectedArrivalId),
  );
  revalidatePath(APP_ROUTES.rooms.board);
  revalidatePath(APP_ROUTES.allocations.list);
  revalidatePath(APP_ROUTES.stays.list);
  revalidatePath(APP_ROUTES.dashboards.reception);
  revalidatePath(APP_ROUTES.dashboards.security);
  revalidatePath(APP_ROUTES.dashboards.campManager);

  const updated = await getExpectedArrivalById(expectedArrivalId);

  if (!updated) {
    throw new Error("Expected arrival was allocated but could not be loaded.");
  }

  return updated;
}