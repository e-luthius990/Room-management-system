type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  namespace: string;
};

type RateLimitResult =
  | {
      limited: false;
      remaining: number;
      resetAt: number;
    }
  | {
      limited: true;
      retryAfterSeconds: number;
      resetAt: number;
    };

const buckets = new Map<string, RateLimitBucket>();
const MAX_BUCKETS = 10_000;

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    "unknown-client"
  );
}

export function checkRateLimit({
  key,
  limit,
  windowMs,
  namespace,
}: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const bucketKey = `${namespace}:${key}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;

    buckets.set(bucketKey, {
      count: 1,
      resetAt,
    });

    pruneExpiredBuckets(now);

    return {
      limited: false,
      remaining: Math.max(limit - 1, 0),
      resetAt,
    };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return {
      limited: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
      resetAt: existing.resetAt,
    };
  }

  return {
    limited: false,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

function pruneExpiredBuckets(now: number): void {
  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}
