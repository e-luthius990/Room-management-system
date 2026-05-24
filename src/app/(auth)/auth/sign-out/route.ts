import { NextResponse, type NextRequest } from "next/server";

import { AUTH_ROUTES } from "@/lib/auth/routes";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function redirectToLogin(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL(AUTH_ROUTES.login, request.url));
  response.headers.set("Cache-Control", "no-store");

  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();

  return redirectToLogin(request);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return redirectToLogin(request);
}