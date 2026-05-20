import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/db/types";
import { AUTH_ROUTES, SYSTEM_ROUTES } from "@/lib/auth/routes";

const PUBLIC_PATHS = new Set<string>([
  AUTH_ROUTES.callback,
  AUTH_ROUTES.acceptInvite,
  AUTH_ROUTES.resetPassword,
  SYSTEM_ROUTES.accessPending,
  SYSTEM_ROUTES.accountSuspended,
]);

const AUTH_ENTRY_PATHS = new Set<string>([
  AUTH_ROUTES.login,
  AUTH_ROUTES.forgotPassword,
]);

const PUBLIC_FILE_PATTERN =
  /\.(?:avif|bmp|css|csv|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webp|woff|woff2|xml)$/i;

const API_PREFIX = "/api/";
const BLOCKED_NEXT_PREFIXES = ["/auth/", "/api/", "/_next/"] as const;

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

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE_PATTERN.test(pathname)
  );
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || isStaticAsset(pathname);
}

function isAuthEntryPath(pathname: string): boolean {
  return AUTH_ENTRY_PATHS.has(pathname);
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith(API_PREFIX);
}

function hasLikelySupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      ({ name }) => name.startsWith("sb-") && name.includes("-auth-token"),
    );
}

function getSafeNextPath(value: string): string | null {
  const nextPath = value.trim();

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

  return nextPath;
}

function createPassThroughResponse(request: NextRequest): NextResponse {
  const response = NextResponse.next({
    request,
  });

  response.headers.set("Cache-Control", "no-store");

  return response;
}

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    const { name, value, ...options } = cookie;

    target.cookies.set(name, value, options);
  });

  return target;
}

function redirectToLogin(request: NextRequest): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  const safeNextPath = getSafeNextPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  redirectUrl.pathname = AUTH_ROUTES.login;
  redirectUrl.search = "";

  if (safeNextPath) {
    redirectUrl.searchParams.set("next", safeNextPath);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("Cache-Control", "no-store");

  return response;
}

function redirectToDashboard(request: NextRequest): NextResponse {
  const redirectUrl = request.nextUrl.clone();

  redirectUrl.pathname = SYSTEM_ROUTES.dashboard;
  redirectUrl.search = "";

  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("Cache-Control", "no-store");

  return response;
}

function unauthorizedJson(): NextResponse {
  const response = NextResponse.json(
    {
      error: "UNAUTHORIZED",
      message: "Authentication is required.",
    },
    { status: 401 },
  );

  response.headers.set("Cache-Control", "no-store");

  return response;
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next({
      request,
    });
  }

  if (isPublicPath(pathname)) {
    return createPassThroughResponse(request);
  }

  if (isAuthEntryPath(pathname) && !hasLikelySupabaseAuthCookie(request)) {
    return createPassThroughResponse(request);
  }

  let response = createPassThroughResponse(request);

  const supabase = createServerClient<Database>(
    getPublicSupabaseUrl(),
    getPublicSupabaseKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = createPassThroughResponse(request);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const hasValidSession = !error && Boolean(user);

  if (isAuthEntryPath(pathname)) {
    if (hasValidSession) {
      return copyCookies(response, redirectToDashboard(request));
    }

    return response;
  }

  if (!hasValidSession) {
    if (isApiPath(pathname)) {
      return copyCookies(response, unauthorizedJson());
    }

    return copyCookies(response, redirectToLogin(request));
  }

  return response;
}