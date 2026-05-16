"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { APP_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  allocationInputToRpcPayload,
  createAllocationSchema,
  formatAllocationValidationError,
  getCreateAllocationFormValues,
} from "@/lib/validation/allocations";

export type AllocationActionState = {
  status: "idle" | "error";
  message: string | null;
};

function formatSupabaseError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("vacant ready")) {
    return "That room is no longer ready for allocation.";
  }

  if (normalized.includes("room not found")) {
    return "The selected room could not be found.";
  }

  if (
    normalized.includes("deleted room") ||
    normalized.includes("no longer active")
  ) {
    return "That room is no longer active.";
  }

  if (
    normalized.includes("duplicate key") ||
    normalized.includes("one_active_room") ||
    normalized.includes("already")
  ) {
    return "That room already has an active allocation.";
  }

  if (
    normalized.includes("permission") ||
    normalized.includes("policy") ||
    normalized.includes("rls")
  ) {
    return "You do not have permission to allocate this room.";
  }

  if (
    normalized.includes("guest") &&
    (normalized.includes("camp") || normalized.includes("access"))
  ) {
    return "The selected guest is not cleared for this camp.";
  }

  if (normalized.includes("expected arrival")) {
    return "Expected arrival is required.";
  }

  if (normalized.includes("expected departure")) {
    return "Expected departure must be after expected arrival.";
  }

  if (normalized.includes("room and allocation must belong to the same camp")) {
    return "The selected room does not match the allocation camp.";
  }

  return "Room allocation failed. Refresh and try again.";
}

export async function createAllocationAction(
  _previousState: AllocationActionState,
  formData: FormData,
): Promise<AllocationActionState> {
  await requireAnyPermission(["allocations.create"]);

  const parsed = createAllocationSchema.safeParse(
    getCreateAllocationFormValues(formData),
  );

  if (!parsed.success) {
    return {
      status: "error",
      message: formatAllocationValidationError(parsed.error),
    };
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc(
    "allocate_room",
    allocationInputToRpcPayload(parsed.data),
  );

  if (error) {
    return {
      status: "error",
      message: formatSupabaseError(error.message),
    };
  }

  const allocation = data as { id?: string } | null;

  revalidatePath(APP_ROUTES.allocations.list);
  revalidatePath(APP_ROUTES.rooms.board);
  revalidatePath(APP_ROUTES.rooms.list);
  revalidatePath(APP_ROUTES.stays.list);
  revalidatePath(APP_ROUTES.dashboard);
  revalidatePath(APP_ROUTES.dashboards.reception);
  revalidatePath(APP_ROUTES.dashboards.campManager);

  if (allocation?.id) {
    redirect(APP_ROUTES.allocations.detail(allocation.id));
  }

  redirect(APP_ROUTES.allocations.list);
}