import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";

const ALLOWED_AUTH_NEXT_PATHS = new Set<string>([
  AUTH_ROUTES.acceptInvite,
  AUTH_ROUTES.resetPassword,
]);

function getSafeNextPath(value: string | null): string {
  if (!value) {
    return SYSTEM_ROUTES.dashboard;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return SYSTEM_ROUTES.dashboard;
  }

  if (value.startsWith("/auth/") && !ALLOWED_AUTH_NEXT_PATHS.has(value)) {
    return SYSTEM_ROUTES.dashboard;
  }

  return value;
}

function redirectToLoginWithError(
  requestUrl: URL,
  error: string,
): NextResponse {
  const redirectUrl = new URL(AUTH_ROUTES.login, requestUrl.origin);
  redirectUrl.searchParams.set("error", error);

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return redirectToLoginWithError(requestUrl, "missing_auth_code");
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectToLoginWithError(requestUrl, "auth_callback_failed");
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}