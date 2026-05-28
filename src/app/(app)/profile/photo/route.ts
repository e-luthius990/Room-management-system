import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/require-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProfilePhotoRow = {
  profile_photo_bucket: string | null;
  profile_photo_path: string | null;
};

export async function GET(): Promise<NextResponse> {
  const currentUser = await requireAuth();
  const supabase = createSupabaseAdminClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("profile_photo_bucket,profile_photo_path")
    .eq("id", currentUser.authUser.id)
    .returns<ProfilePhotoRow[]>()
    .maybeSingle();

  if (
    error ||
    !profile?.profile_photo_bucket ||
    !profile.profile_photo_path
  ) {
    return new NextResponse(null, { status: 404 });
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(profile.profile_photo_bucket)
    .createSignedUrl(profile.profile_photo_path, 60);

  if (signedUrlError || !data?.signedUrl) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, {
    status: 307,
    headers: {
      "Cache-Control": "private, max-age=45",
    },
  });
}
