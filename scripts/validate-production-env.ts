const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const URL_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
] as const;

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function main(): void {
  const failures: string[] = [];

  for (const key of REQUIRED_KEYS) {
    if (!process.env[key]?.trim()) {
      failures.push(`${key} is required.`);
    }
  }

  if (process.env.NODE_ENV === "production") {
    for (const key of URL_KEYS) {
      const value = process.env[key]?.trim();

      if (value && !isHttpsUrl(value)) {
        failures.push(`${key} must be an HTTPS URL in production.`);
      }
    }

    if (process.env.AUTH_DEBUG_TIMING === "true") {
      failures.push("AUTH_DEBUG_TIMING must not be true in production.");
    }

    if (process.env.DASHBOARD_DEBUG_TIMING === "true") {
      failures.push("DASHBOARD_DEBUG_TIMING must not be true in production.");
    }
  }

  if (failures.length > 0) {
    console.error("Production environment validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Production environment validation passed.");
}

main();
