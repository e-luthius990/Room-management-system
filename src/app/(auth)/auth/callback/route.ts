import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/db/types";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";
import { loginSchema } from "@/lib/validation/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getDefaultRouteForRole } from "@/lib/auth/redirect-by-role";
import type { RoleKey } from "@/lib/auth/types";

type LoginRouteResponse =
  | {
      ok: true;
      redirectTo: string;
    }
  | {
      ok: false;
      error: string;
    };

type RoleJoinRow = {
  key?: string | null;
};

const ALLOWED_AUTH_NEXT_PATHS = new Set<string>([
  AUTH_ROUTES.acceptInvite,
  AUTH_ROUTES.resetPassword,
]);

const BLOCKED_NEXT_PREFIXES = ["/api/", "/_next/"] as const;

const AUTH_TIMING_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.AUTH_DEBUG_TIMING === "true";

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

function normalizeRoleJoin(value: unknown): RoleJoinRow | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    const first = value[0];

    return first && typeof first === "object" ? (first as RoleJoinRow) : null;
  }

  return typeof value === "object" ? (value as RoleJoinRow) : null;
}

async function getDefaultPostLoginPath(userId: string): Promise<string> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("user_roles")
    .select("roles!inner(key)")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("assigned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to resolve post-login role:", error.message);
    return SYSTEM_ROUTES.dashboard;
  }

  const roleRow = data as { roles?: unknown } | null;
  const role = normalizeRoleJoin(roleRow?.roles ?? null);
  const roleKey = role?.key as RoleKey | null | undefined;

  if (!roleKey) {
    return SYSTEM_ROUTES.dashboard;
  }

  return getDefaultRouteForRole(roleKey);
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<LoginRouteResponse>> {
  const mark = createAuthTimer("auth/callback:POST");

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

  const redirectTo =
    requestedNextPath ?? (await getDefaultPostLoginPath(data.user.id));
  mark("default route resolved");

  const finalResponse = jsonResponse(
    {
      ok: true,
      redirectTo: getSafeNextPath(redirectTo),
    },
    200,
  );
  mark("response prepared");

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
    return redirectToLoginWithError(requestUrl, "auth_callback_failed");
  }

  return response;
}