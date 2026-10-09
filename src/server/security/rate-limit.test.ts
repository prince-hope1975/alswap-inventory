import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { clientIp, createRateLimiter, enforceRateLimit } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit inside the window, then blocks", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    expect(limiter.check("a", 0)).toEqual({ ok: true, remaining: 2 });
    expect(limiter.check("a", 100)).toEqual({ ok: true, remaining: 1 });
    expect(limiter.check("a", 200)).toEqual({ ok: true, remaining: 0 });
    expect(limiter.check("a", 300)).toEqual({ ok: false, retryAfterMs: 700 });
  });

  it("slides: each hit expires windowMs after it happened", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    limiter.check("a", 0);
    limiter.check("a", 500);
    expect(limiter.check("a", 999).ok).toBe(false);
    // The hit at 0 has aged out; the one at 500 still counts.
    expect(limiter.check("a", 1000).ok).toBe(true);
    expect(limiter.check("a", 1200)).toEqual({ ok: false, retryAfterMs: 300 });
  });

  it("does not count blocked attempts against the window", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.check("a", 0);
    for (let t = 100; t < 1000; t += 100) expect(limiter.check("a", t).ok).toBe(false);
    expect(limiter.check("a", 1000).ok).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("a", 0).ok).toBe(true);
    expect(limiter.check("b", 0).ok).toBe(true);
    expect(limiter.check("a", 1).ok).toBe(false);
  });

  it("evicts the least recently used key past maxKeys", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2 });
    limiter.check("a", 0);
    limiter.check("b", 0);
    limiter.check("c", 0);
    expect(limiter.size()).toBe(2);
    // "a" was evicted, so it starts fresh.
    expect(limiter.check("a", 1).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the left-most x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1", "x-real-ip": "9.9.9.9" }))).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("enforceRateLimit", () => {
  it("throws TOO_MANY_REQUESTS with a friendly message once exhausted", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    const headers = new Headers({ "x-forwarded-for": "5.5.5.5" });
    enforceRateLimit(limiter, headers);
    try {
      enforceRateLimit(limiter, headers);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("TOO_MANY_REQUESTS");
      expect((error as TRPCError).message).toMatch(/try again/);
    }
  });
});
