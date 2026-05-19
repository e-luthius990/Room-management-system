import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/db/types";

const AUTH_PREFIX = "/auth";

const PUBLIC_PATHS = new Set<string>([
  "/auth/login",
  "/auth/callback",
  "/auth/accept-invite",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/access-pending",
  "/account-suspended",
]);

const PUBLIC_FILE_PATTERN =
  /\.(?:avif|bmp|css|csv|gif|ico|jpg|jpeg|js|json|map|png|svg|txt|webp|woff|woff2|xml)$/i;

const API_PREFIX = "/api/";

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

function isApiPath(pathname: string): boolean {
  return pathname.startsWith(API_PREFIX);
}

function isAuthPath(pathname: string): boolean {
  return pathname.startsWith(AUTH_PREFIX);
}

function redirectToLogin(request: NextRequest): NextResponse {
  const redirectUrl = request.nextUrl.clone();

  redirectUrl.pathname = "/auth/login";
  redirectUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(redirectUrl);
}

function redirectToDashboard(request: NextRequest): NextResponse {
  const redirectUrl = request.nextUrl.clone();

  redirectUrl.pathname = "/dashboard";
  redirectUrl.search = "";

  return NextResponse.redirect(redirectUrl);
}

function unauthorizedJson(): NextResponse {
  return NextResponse.json(
    {
      error: "UNAUTHORIZED",
      message: "Authentication is required.",
    },
    { status: 401 },
  );
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  /**
   * Important performance guard:
   * Do not even create the Supabase middleware client for static/public paths.
   */
  if (isPublicPath(pathname)) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

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

          response = NextResponse.next({
            request,
          });

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

  if (!hasValidSession) {
    if (isApiPath(pathname)) {
      return unauthorizedJson();
    }

    return redirectToLogin(request);
  }

  /**
   * This normally only applies if your matcher allows protected auth paths.
   * Public auth pages already returned above.
   */
  if (isAuthPath(pathname)) {
    return redirectToDashboard(request);
  }

  return response;
}