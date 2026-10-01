import { db } from "@/lib/db";
import { AppError, handleError } from "@/lib/errors";
import { verifyPassword } from "@/lib/password";
import { checkLimit, clientIp, rateLimit, recordHit } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    rateLimit(`login-ip:${clientIp(req)}`, 30); // coarse (the header is spoofable)
    const { email, password } = loginSchema.parse(await req.json());
    checkLimit(`login-fail:${email}`, 5); // real brute-force defence: 5 failures per account per 15 min
    const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, passwordHash: true, tokenVersion: true } });
    // Same error for unknown email and wrong password (no account enumeration).
    if (!(await verifyPassword(password, user?.passwordHash)) || !user) {
      recordHit(`login-fail:${email}`, 15 * 60_000);
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    await setSessionCookie(user.id, user.tokenVersion);
    return Response.json({ user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    return handleError(err);
  }
}
