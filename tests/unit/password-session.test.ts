import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSessionToken, verifySessionToken } from "@/lib/session";

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const [a, b] = await Promise.all([hashPassword("correct horse"), hashPassword("correct horse")]);
    expect(a).not.toBe(b);
    expect(a).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", a)).toBe(true);
    expect(await verifyPassword("wrong", a)).toBe(false);
  });
  it("rejects when there is no stored hash (unknown user) without throwing", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips user id and version", async () => {
    expect(await verifySessionToken(await createSessionToken("user-1", 3))).toEqual({ userId: "user-1", version: 3 });
  });
  it("rejects tampered, garbage and wrongly-signed tokens", async () => {
    const t = await createSessionToken("user-1");
    expect(await verifySessionToken(t.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySessionToken("abc.def.ghi")).toBeNull();
    const forged = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("admin").setExpirationTime("1h").sign(new TextEncoder().encode("a-different-secret-a-different-secret"));
    expect(await verifySessionToken(forged)).toBeNull();
  });
  it("rejects expired tokens", async () => {
    const expired = await new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject("u").setExpirationTime(Math.floor(Date.now() / 1000) - 10).sign(new TextEncoder().encode(process.env.AUTH_SECRET!));
    expect(await verifySessionToken(expired)).toBeNull();
  });
});
