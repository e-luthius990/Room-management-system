import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/db/types";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";
import { loginSchema } from "@/lib/validation/auth";

type LoginRouteResponse =
  | {
      ok: true;
      redirectTo: string;
    }
  | {
      ok: false;
      error: string;
    };

const ALLOWED_AUTH_NEXT_PATHS = new Set<string>([
  AUTH_ROUTES.acceptInvite,
  AUTH_ROUTES.resetPassword,
]);

const BLOCKED_NEXT_PREFIXES = ["/api/", "/_next/"] as const;

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

function getSafeNextPath(value: string | null): string {
  const nextPath = value?.trim();

  if (!nextPath || nextPath === "/") {
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

function buildRedirectPath(
  path: string,
  params: Record<string, string | null | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();

  return query ? `${path}?${query}` : path;
}

function jsonResponse(
  body: LoginRouteResponse,
  status: number,
): NextResponse<LoginRouteResponse> {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "no-store");

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

export async function POST(
  request: NextRequest,
): Promise<NextResponse<LoginRouteResponse>> {
  let payload: unknown;

  try {
    payload = await request.json();
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

  if (!parsed.success) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_input",
      },
      400,
    );
  }

  const redirectTo = buildRedirectPath(AUTH_ROUTES.callback, {
    next: parsed.data.next ?? SYSTEM_ROUTES.dashboard,
  });

  const response = jsonResponse(
    {
      ok: true,
      redirectTo,
    },
    200,
  );

  const supabase = createCallbackSupabaseClient(request, response);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user || !data.session) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_credentials",
      },
      401,
    );
  }

  return response;
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