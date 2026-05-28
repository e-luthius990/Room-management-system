import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const GUEST_PROFILE_PHOTO_BUCKET = "guest-photos";

const MAX_PROFILE_PHOTO_BYTES = 4 * 1024 * 1024;
const ALLOWED_PROFILE_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type GuestProfilePhotoMetadata = {
  profile_photo_bucket: string;
  profile_photo_path: string;
  profile_photo_mime_type: string;
  profile_photo_updated_at: string;
};

export type GuestProfilePhotoError =
  | "profile_photo_required"
  | "unsupported_profile_photo_type"
  | "profile_photo_too_large"
  | "profile_photo_upload_failed";

export class GuestProfilePhotoUploadError extends Error {
  constructor(readonly code: GuestProfilePhotoError) {
    super(code);
    this.name = "GuestProfilePhotoUploadError";
  }
}

function getImageFile(formData: FormData): File | null {
  const value = formData.get("profilePhoto");

  if (!(value instanceof File) || value.size <= 0) {
    return null;
  }

  return value;
}

export function getProfilePhotoErrorCode(error: unknown): string {
  return error instanceof GuestProfilePhotoUploadError
    ? error.code
    : "profile_photo_upload_failed";
}

export async function uploadRequiredGuestProfilePhoto(
  formData: FormData,
  guestId: string,
): Promise<GuestProfilePhotoMetadata> {
  const file = getImageFile(formData);

  if (!file) {
    throw new GuestProfilePhotoUploadError("profile_photo_required");
  }

  if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
    throw new GuestProfilePhotoUploadError("unsupported_profile_photo_type");
  }

  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new GuestProfilePhotoUploadError("profile_photo_too_large");
  }

  const extension = EXTENSION_BY_TYPE[file.type] ?? "img";
  const storagePath = `${guestId}/profile.${extension}`;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(GUEST_PROFILE_PHOTO_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    console.error("Guest profile photo upload failed", {
      guestId,
      storagePath,
      message: error.message,
    });

    throw new GuestProfilePhotoUploadError("profile_photo_upload_failed");
  }

  return {
    profile_photo_bucket: GUEST_PROFILE_PHOTO_BUCKET,
    profile_photo_path: storagePath,
    profile_photo_mime_type: file.type,
    profile_photo_updated_at: new Date().toISOString(),
  };
}

export async function uploadOptionalGuestProfilePhoto(
  formData: FormData,
  guestId: string,
): Promise<GuestProfilePhotoMetadata | null> {
  if (!getImageFile(formData)) {
    return null;
  }

  return uploadRequiredGuestProfilePhoto(formData, guestId);
}

export async function deleteGuestProfilePhoto(
  metadata: Pick<GuestProfilePhotoMetadata, "profile_photo_path">,
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(GUEST_PROFILE_PHOTO_BUCKET)
    .remove([metadata.profile_photo_path]);

  if (error) {
    console.error("Failed to remove guest profile photo", {
      storagePath: metadata.profile_photo_path,
      message: error.message,
    });
  }
}
