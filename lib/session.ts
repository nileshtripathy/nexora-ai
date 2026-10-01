import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7;
const key = () => new TextEncoder().encode(env().AUTH_SECRET);

/** `ver` is the user's tokenVersion: bumping it server-side revokes every token issued before. */
export const createSessionToken = (userId: string, version = 0) =>
  new SignJWT({ ver: version }).setProtectedHeader({ alg: "HS256" }).setSubject(userId).setIssuedAt().setExpirationTime("7d").sign(key());

export async function verifySessionToken(token: string): Promise<{ userId: string; version: number } | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.sub ? { userId: payload.sub, version: typeof payload.ver === "number" ? payload.ver : 0 } : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string, version = 0) {
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(userId, version), {
    httpOnly: true, // not readable from JS
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
