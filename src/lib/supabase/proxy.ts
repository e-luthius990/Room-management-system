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

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE_PATTERN.test(pathname)
  );
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
    { error: "UNAUTHORIZED", message: "Authentication is required." },
    { status: 401 },
  );
}

export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
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

  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return response;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const hasValidSession = !error && Boolean(user);

  if (!hasValidSession) {
    if (pathname.startsWith("/api/")) {
      return unauthorizedJson();
    }

    return redirectToLogin(request);
  }

  if (pathname === "/auth/login") {
    return redirectToDashboard(request);
  }

  if (hasValidSession && isAuthPath(pathname)) {
    return redirectToDashboard(request);
  }

  return response;
}