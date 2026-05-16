// src/lib/actions/users/delete-invited-user-action.ts

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const deleteInvitedUserSchema = z.object({
  userId: z.string().uuid("Invalid user ID."),
  reason: z
    .string()
    .trim()
    .min(8, "A deletion reason is required.")
    .max(240, "Deletion reason is too long."),
});

export type DeleteInvitedUserActionResult = {
  ok: boolean;
  message: string;
};

export async function deleteInvitedUserAction(
  input: unknown,
): Promise<DeleteInvitedUserActionResult> {
  const parsed = deleteInvitedUserSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid delete request.",
    };
  }

  const { userId, reason } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const supabaseAdmin = createSupabaseAdminClient();

  const { data: currentAuthUser, error: currentAuthError } =
    await supabase.auth.getUser();

  if (currentAuthError || !currentAuthUser.user) {
    return {
      ok: false,
      message: "You must be signed in to delete a user.",
    };
  }

  if (currentAuthUser.user.id === userId) {
    return {
      ok: false,
      message: "You cannot delete your own account.",
    };
  }

  const { data: targetProfile, error: targetProfileError } =
    await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, account_status")
      .eq("id", userId)
      .maybeSingle();

  if (targetProfileError) {
    return {
      ok: false,
      message: "Could not verify the selected user.",
    };
  }

  if (!targetProfile) {
    return {
      ok: false,
      message: "User profile was not found.",
    };
  }

  if (targetProfile.account_status !== "invited") {
    return {
      ok: false,
      message:
        "Only invited users can be permanently deleted. Deactivate this user instead.",
    };
  }

  const { error: rpcError } = await supabase.rpc("hard_delete_invited_user", {
    p_target_user_id: userId,
    p_reason: reason,
  });

  if (rpcError) {
    return {
      ok: false,
      message: rpcError.message || "Could not delete the user profile.",
    };
  }

  const { error: authDeleteError } =
    await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authDeleteError) {
    return {
      ok: false,
      message:
        "The app profile was deleted, but the Supabase Auth user could not be deleted. Remove it manually from Authentication > Users.",
    };
  }

  revalidatePath("/admin/users");

  return {
    ok: true,
    message: `${targetProfile.full_name} was permanently deleted.`,
  };
}