import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

let browserClient: SupabaseClient<Database> | null = null;

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

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  browserClient = createBrowserClient<Database>(
    getPublicSupabaseUrl(),
    getPublicSupabaseKey(),
  );

  return browserClient;
}