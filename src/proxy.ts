// src/proxy.ts

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:avif|bmp|css|csv|gif|ico|jpg|jpeg|js|json|map|pdf|png|svg|txt|webp|woff|woff2|xml)$).*)",
  ],
};