type Sample = {
  ok: boolean;
  status: number;
  durationMs: number;
};

export {};

const targetUrl = requiredEnv("LOAD_TEST_BASE_URL").replace(/\/+$/, "");
const concurrency = readPositiveInt("LOAD_TEST_CONCURRENCY", 5);
const iterations = readPositiveInt("LOAD_TEST_ITERATIONS", 20);
const loginEmail = process.env.LOAD_TEST_LOGIN_EMAIL;
const loginPassword = process.env.LOAD_TEST_LOGIN_PASSWORD;

function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function readPositiveInt(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();

  if (!raw) {
    return fallback;
  }

  const value = Number.parseInt(raw, 10);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function sample(
  label: string,
  action: () => Promise<Response>,
): Promise<Sample> {
  const startedAt = performance.now();
  const response = await action();
  const durationMs = Math.round(performance.now() - startedAt);

  return {
    ok: response.ok,
    status: response.status,
    durationMs,
  };
}

async function runPool(
  label: string,
  count: number,
  worker: () => Promise<Sample>,
): Promise<Sample[]> {
  const samples: Sample[] = [];
  let next = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < count) {
        next += 1;
        samples.push(await worker());
      }
    }),
  );

  report(label, samples);

  return samples;
}

function percentile(values: number[], pct: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1),
  );

  return sorted[index] ?? 0;
}

function report(label: string, samples: Sample[]): void {
  const durations = samples.map((sample) => sample.durationMs);
  const failures = samples.filter((sample) => !sample.ok);

  console.log(
    JSON.stringify({
      label,
      total: samples.length,
      failed: failures.length,
      min_ms: Math.min(...durations),
      p50_ms: percentile(durations, 50),
      p95_ms: percentile(durations, 95),
      max_ms: Math.max(...durations),
      statuses: Object.fromEntries(
        [...new Set(samples.map((sample) => sample.status))].map((status) => [
          status,
          samples.filter((sample) => sample.status === status).length,
        ]),
      ),
    }),
  );
}

async function main(): Promise<void> {
  await runPool("health", iterations, () => {
    return sample("health", () =>
      fetch(`${targetUrl}/api/health`, {
        cache: "no-store",
      }),
    );
  });

  if (loginEmail && loginPassword) {
    await runPool("login", iterations, () => {
      return sample("login", () =>
        fetch(`${targetUrl}/auth/callback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: targetUrl,
          },
          body: JSON.stringify({
            email: loginEmail,
            password: loginPassword,
          }),
        }),
      );
    });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
