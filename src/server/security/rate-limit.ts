import { TRPCError } from "@trpc/server";

/**
 * Best-effort, in-memory, per-key sliding-window rate limiter.
 *
 * State lives in this server instance only: on serverless each warm instance
 * counts separately and a cold start resets the counts. That is enough to
 * blunt a single client hammering the public checkout endpoints; it is not a
 * hard global quota (that needs a shared store such as Redis).
 */
export type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfterMs: number };

export type RateLimiter = {
  check(key: string, now?: number): RateLimitResult;
  /** Number of keys currently tracked (for tests / diagnostics). */
  size(): number;
};

export function createRateLimiter(options: {
  limit: number;
  windowMs: number;
  /** Upper bound on tracked keys so a flood of spoofed IPs can't exhaust memory. */
  maxKeys?: number;
}): RateLimiter {
  const { limit, windowMs } = options;
  const maxKeys = options.maxKeys ?? 10_000;
  // Map keeps insertion order; a key is re-inserted on each hit, so the first
  // entry is always the least recently used one.
  const hits = new Map<string, number[]>();

  return {
    check(key, now = Date.now()) {
      const cutoff = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((at) => at > cutoff);
      hits.delete(key);

      if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterMs: Math.max(0, recent[0]! + windowMs - now) };
      }

      recent.push(now);
      hits.set(key, recent);
      while (hits.size > maxKeys) {
        const oldest = hits.keys().next().value;
        if (oldest === undefined) break;
        hits.delete(oldest);
      }
      return { ok: true, remaining: limit - recent.length };
    },
    size() {
      return hits.size;
    },
  };
}

/**
 * Client IP for rate limiting. On Vercel `x-forwarded-for` is set by the
 * platform (left-most entry is the client); `x-real-ip` is the fallback.
 */
export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

const MINUTE = 60_000;

/** Buckets for the unauthenticated storefront checkout procedures. */
export const shopRateLimits = {
  // Unpaid orders that reserve stock: the tightest bucket.
  payOnPickupOrder: createRateLimiter({ limit: 5, windowMs: 10 * MINUTE }),
  // Separate so a shopper who already paid can always confirm the payment.
  paystackVerify: createRateLimiter({ limit: 20, windowMs: 10 * MINUTE }),
  paystackInit: createRateLimiter({ limit: 10, windowMs: 10 * MINUTE }),
  // The checkout modal re-quotes as the address is typed, so this is generous.
  deliveryEstimate: createRateLimiter({ limit: 60, windowMs: 10 * MINUTE }),
};

/** Throw TOO_MANY_REQUESTS when this client has used up `limiter`. */
export function enforceRateLimit(limiter: RateLimiter, headers: Headers) {
  const result = limiter.check(clientIp(headers));
  if (!result.ok) {
    const minutes = Math.max(1, Math.ceil(result.retryAfterMs / MINUTE));
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many attempts. Please wait about ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`,
    });
  }
}
