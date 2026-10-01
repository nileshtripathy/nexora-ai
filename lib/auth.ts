import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import type { SessionUser } from "@/types";

export const isStaff = (role: UserRole) => role === "ADMIN" || role === "AGENT";

/**
 * The single seam every route/page/tool uses to learn who is calling.
 * Identity ALWAYS comes from the signed session cookie, never from request bodies or model output.
 * The user is re-read from the DB each time, so deleted users and revoked sessions (tokenVersion) lose access immediately.
 */
export async function getCurrentUser(): Promise<SessionUser> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const user = session
    ? await db.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, name: true, role: true, tokenVersion: true } })
    : null;
  if (!user || user.tokenVersion !== session?.version) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  const { tokenVersion: _ignored, ...safe } = user;
  return safe;
}

/** For server components: send signed-out visitors to the login page. Deduplicated per request (layout + page share one DB read). */
export const requireUserPage = cache(async (): Promise<SessionUser> => {
  try {
    return await getCurrentUser();
  } catch (err) {
    if (err instanceof AppError && err.status === 401) redirect("/login");
    throw err;
  }
});

/** Staff-only pages: signed-in non-staff users are sent back to the chat. */
export async function requireStaffPage(): Promise<SessionUser> {
  const user = await requireUserPage();
  if (!isStaff(user.role)) redirect("/");
  return user;
}

/** Guard for staff-only API endpoints. */
export async function requireRole(roles: UserRole[]): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) throw new AppError(403, "FORBIDDEN", "You don't have permission to do that.");
  return user;
}
