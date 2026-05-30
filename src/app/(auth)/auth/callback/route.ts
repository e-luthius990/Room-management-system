import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/db/types";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";
import { loginSchema } from "@/lib/validation/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDefaultRouteForRole } from "@/lib/auth/redirect-by-role";
import type { RoleKey } from "@/lib/auth/types";
import { logError, logEvent } from "@/lib/observability/logger";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { isSameOriginRequest } from "@/lib/security/request-origin";

type LoginRouteResponse =
  | {
      ok: true;
      redirectTo: string;
    }
  | {
      ok: false;
      error: string;
    };

type JsonRecord = Record<string, unknown>;

type AccountStatus =
  | "active"
  | "disabled"
  | "suspended"
  | "pending_password_reset"
  | "invited";

const ALLOWED_AUTH_NEXT_PATHS = new Set<string>([
  AUTH_ROUTES.acceptInvite,
  AUTH_ROUTES.resetPassword,
]);

const BLOCKED_NEXT_PREFIXES = ["/api/", "/_next/"] as const;

const AUTH_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.AUTH_DEBUG_TIMING === "true";
const LOGIN_RATE_LIMIT_WINDOW_MS = 60_000;
const LOGIN_RATE_LIMIT_REQUESTS = 12;

function createAuthTimer(scope: string): (label: string) => void {
  const startedAt = performance.now();

  return (label: string): void => {
    if (!AUTH_TIMING_ENABLED) {
      return;
    }

    console.info(
      `[${scope}] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
    );
  };
}

function getPublicSupabaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  return value;
}

function getPublicSupabaseKey(): string {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!value) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }

  return value;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : null;
}

function getBoolean(value: unknown): boolean {
  return value === true;
}

function isAllowedAuthNextPath(path: string): boolean {
  return ALLOWED_AUTH_NEXT_PATHS.has(path);
}

function getSafeOptionalNextPath(value: string | null | undefined): string | null {
  const nextPath = value?.trim();

  if (!nextPath || nextPath === "/") {
    return null;
  }

  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return null;
  }

  if (nextPath.includes("\\")) {
    return null;
  }

  if (BLOCKED_NEXT_PREFIXES.some((prefix) => nextPath.startsWith(prefix))) {
    return null;
  }

  if (nextPath.startsWith("/auth/") && !isAllowedAuthNextPath(nextPath)) {
    return null;
  }

  return nextPath;
}

function getSafeNextPath(value: string | null | undefined): string {
  return getSafeOptionalNextPath(value) ?? SYSTEM_ROUTES.dashboard;
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

function jsonResponse(
  body: LoginRouteResponse,
  status: number,
): NextResponse<LoginRouteResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");

  return response;
}

function copyCookies<TBody>(
  source: NextResponse,
  target: NextResponse<TBody>,
): NextResponse<TBody> {
  source.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;

    target.cookies.set(name, value, options);
  });

  return target;
}

function rateLimitResponse(
  retryAfterSeconds: number,
): NextResponse<LoginRouteResponse> {
  const response = jsonResponse(
    {
      ok: false,
      error: "rate_limited",
    },
    429,
  );

  response.headers.set("Retry-After", String(retryAfterSeconds));

  return response;
}

function redirectToLoginWithError(
  requestUrl: URL,
  error: string,
): NextResponse {
  const redirectUrl = new URL(AUTH_ROUTES.login, requestUrl.origin);
  redirectUrl.searchParams.set("error", error);

  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("Cache-Control", "no-store");

  return response;
}

function createRedirectResponse(requestUrl: URL, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, requestUrl.origin));
  response.headers.set("Cache-Control", "no-store");

  return response;
}

function createCallbackSupabaseClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient<Database>(
    getPublicSupabaseUrl(),
    getPublicSupabaseKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}

function getAccountStatusError(status: string | null): string | null {
  if (status === "active") {
    return null;
  }

  if (status === "disabled") {
    return "account_disabled";
  }

  if (status === "suspended") {
    return "account_suspended";
  }

  if (status === "pending_password_reset") {
    return "pending_password_reset";
  }

  return "access_denied";
}

async function getPostLoginPathFromSnapshot(userId: string): Promise<
  | {
      ok: true;
      redirectTo: string;
    }
  | {
      ok: false;
      error: string;
    }
> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("get_current_user_context_snapshot", {
    p_user_id: userId,
  });

  if (error || !isRecord(data)) {
    console.error(
      "Failed to resolve current user context:",
      error?.message ?? "Invalid context payload.",
    );

    return {
      ok: false,
      error: "session_failed",
    };
  }

  const profile = isRecord(data.profile) ? data.profile : null;
  const role = isRecord(data.role) ? data.role : null;

  if (!profile || !role) {
    return {
      ok: false,
      error: "access_denied",
    };
  }

  const accountStatus = getString(profile.account_status) as AccountStatus | null;
  const accountError = getAccountStatusError(accountStatus);

  if (accountError) {
    return {
      ok: false,
      error: accountError,
    };
  }

  const roleKey = getString(role.key) as RoleKey | null;
  const canAccessSystem = getBoolean(role.canAccessSystem);

  if (!roleKey || !canAccessSystem) {
    return {
      ok: false,
      error: "access_denied",
    };
  }

  return {
    ok: true,
    redirectTo: getDefaultRouteForRole(roleKey),
  };
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<LoginRouteResponse>> {
  const mark = createAuthTimer("auth/callback:POST");
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit({
    key: clientIp,
    limit: LOGIN_RATE_LIMIT_REQUESTS,
    windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
    namespace: "auth-login",
  });

  if (rateLimit.limited) {
    logEvent("warn", "auth.login.rate_limited", {
      client_ip: clientIp,
      retry_after_seconds: rateLimit.retryAfterSeconds,
    });

    return rateLimitResponse(rateLimit.retryAfterSeconds);
  }

  if (!isSameOriginRequest(request)) {
    logEvent("warn", "auth.login.cross_origin_blocked", {
      client_ip: clientIp,
      origin: request.headers.get("origin"),
    });

    return jsonResponse(
      {
        ok: false,
        error: "invalid_request_origin",
      },
      403,
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
    mark("request json parsed");
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_input",
      },
      400,
    );
  }

  const parsed = loginSchema.safeParse(payload);
  mark("payload validated");

  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_input",
      },
      400,
    );
  }

  const cookieResponse = jsonResponse(
    {
      ok: true,
      redirectTo: SYSTEM_ROUTES.dashboard,
    },
    200,
  );

  const supabase = createCallbackSupabaseClient(request, cookieResponse);
  mark("supabase client created");

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  mark("signInWithPassword completed");

  if (error || !data.user || !data.session) {
    logEvent("warn", "auth.login.invalid_credentials", {
      client_ip: clientIp,
    });

    return jsonResponse(
      {
        ok: false,
        error: "invalid_credentials",
      },
      401,
    );
  }

  const requestedNextPath = getSafeOptionalNextPath(parsed.data.next);
  mark("next path normalized");

  const contextResult = await getPostLoginPathFromSnapshot(data.user.id);
  mark("context snapshot resolved");

  if (!contextResult.ok) {
    logEvent("warn", "auth.login.context_rejected", {
      user_id: data.user.id,
      error: contextResult.error,
    });

    const failureResponse = jsonResponse(
      {
        ok: false,
        error: contextResult.error,
      },
      403,
    );

    return copyCookies<LoginRouteResponse>(cookieResponse, failureResponse);
  }

  const finalRedirectTo = requestedNextPath ?? contextResult.redirectTo;

  const finalResponse = jsonResponse(
    {
      ok: true,
      redirectTo: getSafeNextPath(finalRedirectTo),
    },
    200,
  );

  mark("response prepared");
  logEvent("info", "auth.login.succeeded", {
    user_id: data.user.id,
    redirect_to: finalRedirectTo,
  });

  return copyCookies<LoginRouteResponse>(cookieResponse, finalResponse);
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
      rawNext === AUTH_ROUTES.acceptInvite
        ? "invite_expired"
        : "auth_callback_failed";

    return redirectToLoginWithError(requestUrl, error);
  }

  const response = createRedirectResponse(requestUrl, next);
  const supabase = createCallbackSupabaseClient(request, response);

  if (!code) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!error && user) {
      return response;
    }

    return redirectToLoginWithError(
      requestUrl,
      getMissingCodeError({
        rawNext,
        errorCode: callbackErrorCode,
        errorDescription: callbackErrorDescription,
      }),
    );
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logError("auth.callback.exchange_failed", error);

    return redirectToLoginWithError(requestUrl, "auth_callback_failed");
  }

  return response;
}
