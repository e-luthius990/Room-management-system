import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";

const ALLOWED_AUTH_NEXT_PATHS = new Set<string>([
  AUTH_ROUTES.acceptInvite,
  AUTH_ROUTES.resetPassword,
]);

const BLOCKED_NEXT_PREFIXES = ["/api/", "/_next/"] as const;

function isAllowedAuthNextPath(path: string): boolean {
  return ALLOWED_AUTH_NEXT_PATHS.has(path);
}

function getSafeNextPath(value: string | null): string {
  const nextPath = value?.trim();

  if (!nextPath) {
    return SYSTEM_ROUTES.dashboard;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return SYSTEM_ROUTES.dashboard;
  }

  if (nextPath.includes("\\")) {
    return SYSTEM_ROUTES.dashboard;
  }

  if (BLOCKED_NEXT_PREFIXES.some((prefix) => nextPath.startsWith(prefix))) {
    return SYSTEM_ROUTES.dashboard;
  }

  if (nextPath.startsWith("/auth/") && !isAllowedAuthNextPath(nextPath)) {
    return SYSTEM_ROUTES.dashboard;
  }

  return nextPath;
}

function getMissingCodeError({
  rawNext,
  errorCode,
  errorDescription,
}: {
  rawNext: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}): string {
  const normalizedErrorCode = errorCode?.toLowerCase() ?? "";
  const normalizedDescription = errorDescription?.toLowerCase() ?? "";

  const looksExpired =
    normalizedErrorCode.includes("expired") ||
    normalizedDescription.includes("expired");

  if (rawNext === AUTH_ROUTES.acceptInvite && looksExpired) {
    return "invite_expired";
  }

  return "missing_auth_code";
}

function redirectToLoginWithError(
  requestUrl: URL,
  error: string,
): NextResponse {
  const redirectUrl = new URL(AUTH_ROUTES.login, requestUrl.origin);
  redirectUrl.searchParams.set("error", error);

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);

  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");
  const next = getSafeNextPath(rawNext);

  const callbackError = requestUrl.searchParams.get("error");
  const callbackErrorCode = requestUrl.searchParams.get("error_code");
  const callbackErrorDescription = requestUrl.searchParams.get(
    "error_description",
  );

  if (callbackError) {
    const error =
      rawNext === AUTH_ROUTES.acceptInvite ? "invite_expired" : "auth_callback_failed";

    return redirectToLoginWithError(requestUrl, error);
  }

  if (!code) {
    return redirectToLoginWithError(
      requestUrl,
      getMissingCodeError({
        rawNext,
        errorCode: callbackErrorCode,
        errorDescription: callbackErrorDescription,
      }),
    );
  }

  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return redirectToLoginWithError(requestUrl, "auth_callback_failed");
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}