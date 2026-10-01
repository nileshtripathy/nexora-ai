import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { resetRateLimits } from "@/lib/rate-limit";
import { createSessionToken } from "@/lib/session";
import { resetDb, seedAll } from "../helpers/db";

// Minimal stand-in for Next's request cookie store.
const jar = new Map<string, string>();
const setSpy = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (jar.has(k) ? { value: jar.get(k)! } : undefined),
    set: (k: string, v: string, o: unknown) => { jar.set(k, v); setSpy(k, v, o); },
    delete: (k: string) => { jar.delete(k); },
  }),
}));

import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { getCurrentUser } from "@/lib/auth";

const post = (h: (r: Request) => Promise<Response>, body: unknown) =>
  h(new Request("http://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));

beforeAll(async () => { await resetDb(); await seedAll(); });
beforeEach(() => { jar.clear(); setSpy.mockClear(); resetRateLimits(); });

describe("registration", () => {
  it("creates a USER with a hashed password and an httpOnly session cookie", async () => {
    const res = await post(register, { email: "New@Example.com", name: "New", password: "longenough1" });
    expect(res.status).toBe(201);
    const u = await db.user.findUniqueOrThrow({ where: { email: "new@example.com" } });
    expect(u.role).toBe("USER");
    expect(u.passwordHash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(setSpy.mock.calls[0][2]).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });
  it("cannot be used to self-assign a role", async () => {
    await post(register, { email: "sneaky@example.com", name: "S", password: "longenough1", role: "ADMIN" });
    expect((await db.user.findUniqueOrThrow({ where: { email: "sneaky@example.com" } })).role).toBe("USER");
  });
  it("rejects duplicates (409) and weak passwords (400)", async () => {
    expect((await post(register, { email: "alice@example.com", name: "A", password: "longenough1" })).status).toBe(409);
    expect((await post(register, { email: "w@example.com", name: "W", password: "short" })).status).toBe(400);
  });
});

describe("login", () => {
  it("signs in with correct credentials", async () => {
    expect((await post(login, { email: "alice@example.com", password: "demo1234" })).status).toBe(200);
    expect((await getCurrentUser()).email).toBe("alice@example.com");
  });
  it("gives the same error for unknown email and wrong password", async () => {
    const a = await (await post(login, { email: "alice@example.com", password: "nope" })).json();
    const b = await (await post(login, { email: "ghost@example.com", password: "nope" })).json();
    expect(a).toEqual(b);
  });
  it("locks an account after 5 failures, even for the correct password, and doesn't lock others", async () => {
    for (let i = 0; i < 5; i++) await post(login, { email: "bob@example.com", password: "wrong" });
    expect((await post(login, { email: "bob@example.com", password: "demo1234" })).status).toBe(429);
    expect((await post(login, { email: "alice@example.com", password: "demo1234" })).status).toBe(200);
  });
});

describe("sessions", () => {
  it("rejects missing, forged and deleted-user sessions", async () => {
    await expect(getCurrentUser()).rejects.toMatchObject({ status: 401 });
    jar.set("session", "garbage.token.value");
    await expect(getCurrentUser()).rejects.toMatchObject({ status: 401 });
    const ghost = await db.user.create({ data: { email: "ghost@x.dev" } });
    jar.set("session", await createSessionToken(ghost.id, 0));
    await expect(getCurrentUser()).resolves.toMatchObject({ id: ghost.id });
    await db.user.delete({ where: { id: ghost.id } });
    await expect(getCurrentUser()).rejects.toMatchObject({ status: 401 });
  });
  it("'sign out everywhere' revokes tokens that were already issued", async () => {
    await post(login, { email: "alice@example.com", password: "demo1234" });
    const stolen = jar.get("session")!; // a copy of the cookie, e.g. on another device
    expect((await post(logout, { everywhere: true })).status).toBe(200);
    expect(jar.has("session")).toBe(false);
    jar.set("session", stolen);
    await expect(getCurrentUser()).rejects.toMatchObject({ status: 401 });
  });
  it("plain sign-out requires no session and just clears the cookie", async () => {
    jar.set("session", "x");
    expect((await post(logout, {})).status).toBe(200);
    expect(jar.has("session")).toBe(false);
  });
});
