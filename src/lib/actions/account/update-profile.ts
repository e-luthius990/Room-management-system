"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getAccountProfilePhotoErrorCode,
  uploadOptionalAccountProfilePhoto,
} from "@/lib/account-profile-photo";
import { requireAuth } from "@/lib/auth/require-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateOwnProfileSchema } from "@/lib/validation/account";

function buildSettingsRedirectPath(
  params: Record<string, string>,
): string {
  const searchParams = new URLSearchParams(params);
  const query = searchParams.toString();

  return query ? `/profile/settings?${query}` : "/profile/settings";
}

export async function updateOwnProfileAction(
  formData: FormData,
): Promise<never> {
  const currentUser = await requireAuth();

  const parsed = updateOwnProfileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone"),
    department: formData.get("department"),
    jobTitle: formData.get("jobTitle"),
  });

  if (!parsed.success) {
    redirect(
      buildSettingsRedirectPath({
        error: "invalid_profile",
      }),
    );
  }

  const admin = createSupabaseAdminClient();
  let photoMetadata: Awaited<
    ReturnType<typeof uploadOptionalAccountProfilePhoto>
  >;

  try {
    photoMetadata = await uploadOptionalAccountProfilePhoto(
      formData,
      currentUser.authUser.id,
    );
  } catch (error) {
    redirect(
      buildSettingsRedirectPath({
        error: getAccountProfilePhotoErrorCode(error),
      }),
    );
  }

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      department: parsed.data.department,
      job_title: parsed.data.jobTitle,
      ...(photoMetadata ?? {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentUser.authUser.id);

  if (error) {
    console.error("Failed to update own profile:", error.message);

    redirect(
      buildSettingsRedirectPath({
        error: "update_failed",
      }),
    );
  }

  revalidatePath("/profile");
  revalidatePath("/profile/settings");
  revalidatePath("/", "layout");

  redirect(
    buildSettingsRedirectPath({
      success: "profile_updated",
    }),
  );
}
