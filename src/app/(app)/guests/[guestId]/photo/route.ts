import { NextResponse, type NextRequest } from "next/server";

import { hasCampAccess } from "@/lib/auth/permissions";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type GuestPhotoRouteProps = {
  params: Promise<{
    guestId: string;
  }>;
};

type GuestPhotoRow = {
  primary_camp_id: string;
  profile_photo_bucket: string | null;
  profile_photo_path: string | null;
};

export async function GET(
  _request: NextRequest,
  { params }: GuestPhotoRouteProps,
): Promise<NextResponse> {
  const currentUser = await requireAnyPermission([
    "guests.view",
    "security.view_clearance",
    "security.create_guest_intake",
    "stays.view",
    "rooms.view",
  ]);

  const { guestId } = await params;
  const supabase = createSupabaseAdminClient();

  const { data: guest, error } = await supabase
    .from("guests")
    .select("primary_camp_id,profile_photo_bucket,profile_photo_path")
    .eq("id", guestId)
    .is("archived_at", null)
    .returns<GuestPhotoRow[]>()
    .maybeSingle();

  if (error || !guest?.profile_photo_bucket || !guest.profile_photo_path) {
    return new NextResponse(null, { status: 404 });
  }

  if (!hasCampAccess(currentUser, guest.primary_camp_id, "viewer")) {
    return new NextResponse(null, { status: 404 });
  }

  const { data, error: signedUrlError } = await supabase.storage
    .from(guest.profile_photo_bucket)
    .createSignedUrl(guest.profile_photo_path, 60);

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
