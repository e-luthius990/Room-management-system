import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const REQUIRED_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type HealthResponse = {
  ok: boolean;
  service: "room-ops";
  checkedAt: string;
  missingEnv: string[];
};

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const missingEnv = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  const ok = missingEnv.length === 0;

  return NextResponse.json(
    {
      ok,
      service: "room-ops",
      checkedAt: new Date().toISOString(),
      missingEnv,
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
