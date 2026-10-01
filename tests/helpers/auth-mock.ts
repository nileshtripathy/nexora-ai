import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/types";

let current: SessionUser | null = null;
export const signInAs = (u: SessionUser | null) => { current = u; };

const getCurrentUser = async () => {
  if (!current) throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  return current;
};

/** Drop-in replacement for "@/lib/auth" in route tests (the real one reads Next's request cookies). */
export const authMock = {
  getCurrentUser,
  isStaff: (r: string) => r === "ADMIN" || r === "AGENT",
  requireRole: async (roles: string[]) => {
    const u = await getCurrentUser();
    if (!roles.includes(u.role)) throw new AppError(403, "FORBIDDEN", "You don't have permission to do that.");
    return u;
  },
  requireUserPage: getCurrentUser,
  requireStaffPage: getCurrentUser,
};
