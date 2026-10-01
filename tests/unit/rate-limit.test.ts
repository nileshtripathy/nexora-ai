import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkLimit, rateLimit, recordHit, resetRateLimits } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";

beforeEach(() => { resetRateLimits(); vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("allows up to the limit then throws 429", () => {
    for (let i = 0; i < 3; i++) rateLimit("k", 3);
    expect(() => rateLimit("k", 3)).toThrowError(AppError);
    try { rateLimit("k", 3); } catch (e) { expect((e as AppError).status).toBe(429); }
  });
  it("keys are independent", () => { rateLimit("a", 1); expect(() => rateLimit("b", 1)).not.toThrow(); });
  it("resets after the window", () => {
    rateLimit("k", 1, 1000);
    expect(() => rateLimit("k", 1, 1000)).toThrow();
    vi.advanceTimersByTime(1001);
    expect(() => rateLimit("k", 1, 1000)).not.toThrow();
  });
  it("checkLimit only peeks; recordHit counts (used for failed logins)", () => {
    for (let i = 0; i < 5; i++) { expect(() => checkLimit("f", 5)).not.toThrow(); recordHit("f", 60_000); }
    expect(() => checkLimit("f", 5)).toThrow();
  });
});
