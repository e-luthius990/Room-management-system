import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const ACCOUNT_PROFILE_PHOTO_BUCKET = "profile-photos";

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

export type AccountProfilePhotoMetadata = {
  profile_photo_bucket: string;
  profile_photo_path: string;
  profile_photo_mime_type: string;
  profile_photo_updated_at: string;
};

export type AccountProfilePhotoError =
  | "unsupported_profile_photo_type"
  | "profile_photo_too_large"
  | "profile_photo_upload_failed";

export class AccountProfilePhotoUploadError extends Error {
  constructor(readonly code: AccountProfilePhotoError) {
    super(code);
    this.name = "AccountProfilePhotoUploadError";
  }
}

function getImageFile(formData: FormData): File | null {
  const value = formData.get("profilePhoto");

  if (!(value instanceof File) || value.size <= 0) {
    return null;
  }

  return value;
}

export function getAccountProfilePhotoErrorCode(error: unknown): string {
  return error instanceof AccountProfilePhotoUploadError
    ? error.code
    : "profile_photo_upload_failed";
}

export async function uploadOptionalAccountProfilePhoto(
  formData: FormData,
  profileId: string,
): Promise<AccountProfilePhotoMetadata | null> {
  const file = getImageFile(formData);

  if (!file) {
    return null;
  }

  if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
    throw new AccountProfilePhotoUploadError("unsupported_profile_photo_type");
  }

  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    throw new AccountProfilePhotoUploadError("profile_photo_too_large");
  }

  const extension = EXTENSION_BY_TYPE[file.type] ?? "img";
  const storagePath = `${profileId}/profile.${extension}`;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage
    .from(ACCOUNT_PROFILE_PHOTO_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    console.error("Account profile photo upload failed", {
      profileId,
      storagePath,
      message: error.message,
    });

    throw new AccountProfilePhotoUploadError("profile_photo_upload_failed");
  }

  return {
    profile_photo_bucket: ACCOUNT_PROFILE_PHOTO_BUCKET,
    profile_photo_path: storagePath,
    profile_photo_mime_type: file.type,
    profile_photo_updated_at: new Date().toISOString(),
  };
}
